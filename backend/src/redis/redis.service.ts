import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private publisher: RedisClientType;
  private subscriber: RedisClientType;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function; timer: NodeJS.Timeout }>();

  async onModuleInit() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    this.publisher = createClient({ url });
    this.subscriber = createClient({ url });

    await this.publisher.connect();
    await this.subscriber.connect();

    await this.subscriber.subscribe('ai_responses', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.request_id && this.pendingRequests.has(data.request_id)) {
          const { resolve, timer } = this.pendingRequests.get(data.request_id);
          clearTimeout(timer);
          this.pendingRequests.delete(data.request_id);
          resolve(data);
        }
      } catch (e) {
        console.error('Redis response parse error:', e);
      }
    });

    console.log('Redis Pub/Sub connected');
  }

  async onModuleDestroy() {
    await this.publisher.quit();
    await this.subscriber.quit();
  }

  async publishAndWait(channel: string, payload: any, timeoutMs = 60000): Promise<any> {
    const request_id = uuidv4();
    const message = JSON.stringify({ ...payload, request_id });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(request_id);
        reject(new Error('AI service timeout'));
      }, timeoutMs);

      this.pendingRequests.set(request_id, { resolve, reject, timer });
      this.publisher.publish(channel, message).catch((err) => {
        clearTimeout(timer);
        this.pendingRequests.delete(request_id);
        reject(err);
      });
    });
  }

  async publish(channel: string, payload: any): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(payload));
  }
}
