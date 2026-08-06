import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Document } from '../common/entities/document.entity';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document) private docRepo: Repository<Document>,
    private redisService: RedisService,
  ) {}

  async create(filename: string, originalName: string) {
    const doc = this.docRepo.create({ filename, original_name: originalName, status: 'processing' });
    return this.docRepo.save(doc);
  }

  async findAll() {
    return this.docRepo.find({ order: { upload_date: 'DESC' } });
  }

  async search(query: string) {
    return this.docRepo.find({
      where: { original_name: Like(`%${query}%`) },
      order: { upload_date: 'DESC' },
    });
  }

  async remove(id: string) {
    await this.docRepo.delete(id);
    return { deleted: true };
  }

  async getStats() {
    const total = await this.docRepo.count();
    const processing = await this.docRepo.count({ where: { status: 'processing' } });
    return { total, processing };
  }

  async processDocument(docId: string, filePath: string) {
    const response = await this.redisService.publishAndWait('ai_requests', {
      type: 'process_pdf',
      document_id: docId,
      file_path: filePath,
    }, 120000);

    if (response.success) {
      await this.docRepo.update(docId, { status: 'completed', page_count: response.page_count });
    } else {
      await this.docRepo.update(docId, { status: 'failed' });
    }
    return response;
  }
}
