import { Controller, Post, Get, Body, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { AskDto } from './dto/ask.dto';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('ask')
  async ask(@Body() dto: AskDto) {
    return this.chatService.ask(dto.question, dto.session_id);
  }

  @Get('history/:sessionId')
  async history(@Param('sessionId') sessionId: string) {
    return this.chatService.getHistory(sessionId);
  }

  @Get('sessions')
  async sessions() {
    return this.chatService.getSessions();
  }

  @Get('stats')
  async stats() {
    return this.chatService.getStats();
  }

  @Post('ask-stream')
  async askStream(@Body() dto: AskDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const result = await this.chatService.ask(dto.question, dto.session_id);

    const words = result.answer.split(' ');
    for (let i = 0; i < words.length; i++) {
      res.write(`data: ${JSON.stringify({ chunk: words[i] + ' ', done: false })}\n\n`);
      await new Promise(r => setTimeout(r, 30));
    }
    res.write(`data: ${JSON.stringify({ chunk: '', done: true, sources: result.sources, suggested_questions: result.suggested_questions, session_id: result.session_id })}\n\n`);
    res.end();
  }
}
