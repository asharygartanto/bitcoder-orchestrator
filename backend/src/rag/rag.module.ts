import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { ApiConfigModule } from '../api-config/api-config.module';

@Module({
  imports: [HttpModule, ApiConfigModule],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
