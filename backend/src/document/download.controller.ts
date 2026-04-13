import { Controller, Get, Param, Query, Res, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { DocumentService } from './document.service';
import { JwtService } from '@nestjs/jwt';

@Controller('doc')
export class DownloadController {
  constructor(
    private documentService: DocumentService,
    private jwtService: JwtService,
  ) {}

  @Get('download/:documentId')
  async download(
    @Param('documentId') documentId: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    if (!token) {
      throw new UnauthorizedException('Token required');
    }

    let organizationId: string;
    try {
      const payload = this.jwtService.verify(token);
      organizationId = payload.organizationId;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    return this.documentService.download(documentId, organizationId, res);
  }
}
