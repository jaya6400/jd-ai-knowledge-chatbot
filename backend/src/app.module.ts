import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { ChatModule } from './chat/chat.module';
import { RedisModule } from './redis/redis.module';
import { User } from './common/entities/user.entity';
import { Document } from './common/entities/document.entity';
import { Chat } from './common/entities/chat.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [User, Document, Chat],
      synchronize: true,
      logging: false,
    }),
    AuthModule,
    DocumentsModule,
    ChatModule,
    RedisModule,
  ],
})
export class AppModule {}
