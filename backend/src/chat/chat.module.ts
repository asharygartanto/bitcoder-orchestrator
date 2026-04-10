import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ApiConfigModule } from '../api-config/api-config.module';

@Module({
  imports: [HttpModule, ApiConfigModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
