import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: Error) => void;
  timeout: NodeJS.Timeout;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private pubClient: RedisClientType;
  private subClient: RedisClientType;
  private pending = new Map<string, PendingRequest>();
  private readonly responseChannel = 'ai_responses';

  constructor() {
    const url = process.env.REDIS_URL || 'redis://redis:6379';
    this.pubClient = createClient({ url });
    this.subClient = createClient({ url });

    this.pubClient.connect().catch((e) => this.logger.error('Redis pub connect error:', e));

    this.subClient
      .connect()
      .then(() => this.subClient.subscribe(this.responseChannel, (msg) => this.handleMessage(msg)))
      .catch((e) => this.logger.error('Redis sub connect error:', e));
  }

  onModuleDestroy() {
    // Reject anything still waiting so callers don't hang forever on shutdown
    for (const [, req] of this.pending) {
      clearTimeout(req.timeout);
      req.reject(new Error('Redis service shutting down'));
    }
    this.pending.clear();

    this.pubClient.quit().catch(() => {});
    this.subClient.quit().catch(() => {});
  }

  private handleMessage(msg: string) {
    let data: any;
    try {
      data = JSON.parse(msg);
    } catch {
      this.logger.warn('Received malformed message on ai_responses, ignoring');
      return;
    }

    const requestId = data.request_id;
    const pending = this.pending.get(requestId);
    if (!pending) {
      // No one waiting (already timed out, or not ours) — safe to ignore
      return;
    }

    this.pending.delete(requestId);
    clearTimeout(pending.timeout);
    pending.resolve(data);
  }

  async publishAndWait(channel: string, message: any, timeoutMs: number): Promise<any> {
    const requestId = uuidv4();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error('AI service timeout'));
      }, timeoutMs);

      this.pending.set(requestId, { resolve, reject, timeout });

      const payload = JSON.stringify({ ...message, request_id: requestId });
      this.pubClient.publish(channel, payload).catch((err) => {
        this.pending.delete(requestId);
        clearTimeout(timeout);
        reject(new Error(`Redis error: ${err.message}`));
      });
    });
  }
}
