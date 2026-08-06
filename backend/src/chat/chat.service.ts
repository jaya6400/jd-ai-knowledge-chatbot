import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Chat } from '../common/entities/chat.entity';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat) private chatRepo: Repository<Chat>,
    private redisService: RedisService,
  ) {}

  async ask(question: string, sessionId?: string) {
    const sid = sessionId || uuidv4();

    const history = await this.chatRepo.find({
      where: { session_id: sid },
      order: { timestamp: 'ASC' },
      take: 10,
    });

    const chatHistory = history.map(h => ({
      role: 'user',
      content: h.question,
    })).concat(history.map(h => ({
      role: 'assistant',
      content: h.answer,
    })));

    const response = await this.redisService.publishAndWait('ai_requests', {
      type: 'chat',
      question,
      session_id: sid,
      chat_history: chatHistory,
    }, 60000);

    const chat = this.chatRepo.create({
      session_id: sid,
      question,
      answer: response.answer || 'No answer generated.',
      sources: response.sources || [],
      suggested_questions: response.suggested_questions || [],
    });
    await this.chatRepo.save(chat);

    return {
      session_id: sid,
      answer: chat.answer,
      sources: chat.sources,
      suggested_questions: chat.suggested_questions,
    };
  }

  async getHistory(sessionId: string) {
    return this.chatRepo.find({
      where: { session_id: sessionId },
      order: { timestamp: 'ASC' },
    });
  }

  async getSessions() {
    const result = await this.chatRepo.query(
      `SELECT session_id, MAX(timestamp) as last_message, COUNT(*) as message_count 
       FROM chats 
       GROUP BY session_id 
       ORDER BY last_message DESC`
    );
    return result;
  }

  async getStats() {
    const totalQuestions = await this.chatRepo.count();
    const totalSessions = await this.chatRepo.query(`SELECT COUNT(DISTINCT session_id) as count FROM chats`);
    return {
      total_questions: totalQuestions,
      total_sessions: parseInt(totalSessions[0]?.count || 0),
    };
  }
}
