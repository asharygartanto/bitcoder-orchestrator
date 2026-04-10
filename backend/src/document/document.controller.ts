import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  UseGuards,
  UploadedFile,
  Interceptor,
  UseInterceptors,
  Body,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { DocumentService } from './document.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  @Post('upload/:contextId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async upload(
    @Req() req: Request,
    @Param('contextId') contextId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name?: string,
  ) {
    return this.documentService.upload(
      req.user['organizationId'],
      contextId,
      req.user['id'],
      file,
      name || file.originalname,
    );
  }

  @Get('status/:documentId')
  async getStatus(
    @Req() req: Request,
    @Param('documentId') documentId: string,
  ) {
    return this.documentService.getStatus(documentId, req.user['organizationId']);
  }

  @Get('context/:contextId')
  async findByContext(
    @Req() req: Request,
    @Param('contextId') contextId: string,
  ) {
    return this.documentService.findByContext(req.user['organizationId'], contextId);
  }

  @Delete(':documentId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async remove(
    @Req() req: Request,
    @Param('documentId') documentId: string,
  ) {
    return this.documentService.remove(documentId, req.user['organizationId']);
  }

  @Post('replace/:documentId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async replace(
    @Req() req: Request,
    @Param('documentId') documentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name?: string,
  ) {
    return this.documentService.replace(
      documentId,
      req.user['organizationId'],
      req.user['id'],
      file,
      name || file.originalname,
    );
  }
}
