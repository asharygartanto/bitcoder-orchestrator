import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as cuid from 'cuid';

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
    formData.append('file', new Blob([file.buffer]), file.originalname);
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
}
