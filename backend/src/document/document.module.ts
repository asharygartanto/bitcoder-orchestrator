import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';

@Module({
  imports: [HttpModule],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
