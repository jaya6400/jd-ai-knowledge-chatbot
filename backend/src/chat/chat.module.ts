import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { Chat } from '../common/entities/chat.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {}