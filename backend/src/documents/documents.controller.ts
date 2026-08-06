import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';

@Controller('documents')
export class DocumentsController {
  constructor(private docsService: DocumentsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list() {
    return this.docsService.findAll();
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  async search(@Query('q') q: string) {
    return this.docsService.search(q || '');
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + extname(file.originalname));
      },
    }),
  }))
  async upload(@UploadedFile() file: Express.Multer.File) {
    const doc = await this.docsService.create(file.filename, file.originalname);
    try {
      await this.docsService.processDocument(doc.id, file.filename);
    } catch {
      // Already marked 'failed' inside processDocument; swallow here so the
      // client gets a normal response instead of a 500 on timeout
    }
    return this.docsService.findOne(doc.id);
  }

  @Post(':id/reprocess')
  @UseGuards(JwtAuthGuard)
  async reprocess(@Param('id') id: string) {
    const doc = await this.docsService.findOne(id);
    if (!doc) return { error: 'Not found' };
    try {
      await this.docsService.processDocument(doc.id, doc.filename);
    } catch {
      // Already marked 'failed' inside processDocument
    }
    return this.docsService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    return this.docsService.remove(id);
  }

  @Get('stats/all')
  @UseGuards(JwtAuthGuard)
  async stats() {
    return this.docsService.getStats();
  }
}
