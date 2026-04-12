import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class DocumentService {
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  async upload(
    organizationId: string,
    contextId: string,
    userId: string,
    file: Express.Multer.File,
    documentName: string,
  ) {
    const context = await this.prisma.context.findFirst({
      where: { id: contextId, organizationId },
    });
    if (!context) throw new NotFoundException('Context not found');

    const doc = await this.prisma.document.create({
      data: {
        name: documentName || file.originalname,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        contextId,
        organizationId,
        uploadedById: userId,
        status: 'UPLOADED',
      },
    });

    const ragUrl = process.env.RAG_ENGINE_URL || 'http://localhost:8000';
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(file.buffer)]), file.originalname);
    formData.append('document_id', doc.id);
    formData.append('document_name', doc.name);
    formData.append('context_id', contextId);
    formData.append('organization_id', organizationId);

    try {
      await firstValueFrom(
        this.httpService.post(`${ragUrl}/api/documents/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000,
        }),
      );
    } catch {
      await this.prisma.document.update({
        where: { id: doc.id },
        data: { status: 'ERROR' },
      });
    }

    return doc;
  }

  async getStatus(documentId: string, organizationId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, organizationId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const ragUrl = process.env.RAG_ENGINE_URL || 'http://localhost:8000';
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${ragUrl}/api/documents/status/${documentId}`),
      );

      const statusMap: Record<string, string> = {
        uploaded: 'UPLOADED',
        processing: 'PROCESSING',
        vectorizing: 'VECTORIZING',
        indexing: 'INDEXING',
        ready: 'READY',
        error: 'ERROR',
      };

      const mappedStatus = statusMap[data.status] || data.status?.toUpperCase();

      if (mappedStatus && doc.status !== mappedStatus) {
        await this.prisma.document.update({
          where: { id: documentId },
          data: {
            status: mappedStatus as any,
            vectorCount: data.chunks_count || 0,
          },
        });
      }

      return data;
    } catch {
      return {
        document_id: documentId,
        status: doc.status,
        phase: 'Unknown',
        progress: 0,
        chunks_count: doc.vectorCount,
        message: 'Unable to reach RAG engine',
      };
    }
  }

  async remove(documentId: string, organizationId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, organizationId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const ragUrl = process.env.RAG_ENGINE_URL || 'http://localhost:8000';
    try {
      await firstValueFrom(
        this.httpService.delete(`${ragUrl}/api/documents/delete`, {
          data: {
            document_id: documentId,
            context_id: doc.contextId,
            organization_id: organizationId,
          },
        }),
      );
    } catch {}

    return this.prisma.document.delete({ where: { id: documentId } });
  }

  async replace(
    documentId: string,
    organizationId: string,
    userId: string,
    file: Express.Multer.File,
    documentName: string,
  ) {
    const oldDoc = await this.prisma.document.findFirst({
      where: { id: documentId, organizationId },
    });
    if (!oldDoc) throw new NotFoundException('Document not found');

    await this.remove(documentId, organizationId);

    return this.upload(
      organizationId,
      oldDoc.contextId,
      userId,
      file,
      documentName || oldDoc.name,
    );
  }

  async findByContext(organizationId: string, contextId: string) {
    return this.prisma.document.findMany({
      where: { contextId, organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async download(documentId: string, organizationId: string, res: Response) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, organizationId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const docDir = path.join(uploadDir, organizationId, doc.contextId, documentId);

    if (!fs.existsSync(docDir)) {
      throw new NotFoundException('File not found on disk');
    }

    const files = fs.readdirSync(docDir);
    if (files.length === 0) {
      throw new NotFoundException('File not found on disk');
    }

    const filePath = path.join(docDir, files[0]);
    const ext = path.extname(files[0]).toLowerCase();

    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const fileName = doc.originalName || files[0];

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    fs.createReadStream(filePath).pipe(res);
  }
}
