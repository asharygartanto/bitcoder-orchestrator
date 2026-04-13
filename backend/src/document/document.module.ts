import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { DownloadController } from './download.controller';

@Module({
  imports: [
    HttpModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback-secret',
    }),
  ],
  controllers: [DownloadController, DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
