import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateSessionDto, SendMessageDto } from './dto/chat.dto';
import { ApiConfigService } from '../api-config/api-config.service';
import { Response } from 'express';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private apiConfigService: ApiConfigService,
  ) {}

  async createSession(organizationId: string, userId: string, dto: CreateSessionDto) {
    return this.prisma.chatSession.create({
      data: {
        title: dto.title || 'New Chat',
        userId,
        organizationId,
      },
    });
  }

  async findSessions(organizationId: string, userId: string) {
    return this.prisma.chatSession.findMany({
      where: { userId, organizationId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findSession(organizationId: string, sessionId: string, userId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId, organizationId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async deleteSession(organizationId: string, sessionId: string, userId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId, organizationId },
    });
    if (!session) throw new NotFoundException('Session not found');

    return this.prisma.chatSession.delete({ where: { id: sessionId } });
  }

  async sendMessage(
    organizationId: string,
    sessionId: string,
    userId: string,
    dto: SendMessageDto,
  ) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId, organizationId },
    });
    if (!session) throw new NotFoundException('Session not found');

    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'USER',
        content: dto.content,
      },
    });

    const contexts = await this.prisma.context.findMany({
      where: { organizationId, isActive: true },
      include: { apiConfigs: { where: { isActive: true } } },
    });

    if (contexts.length === 0) {
      throw new NotFoundException('No active contexts found. Please create a context in Admin Panel first.');
    }

    const ragUrl = process.env.RAG_ENGINE_URL || 'http://localhost:8000';
    const contextIds = contexts.map((ctx) => ctx.id);
    const allApiConfigs = contexts.flatMap((ctx) =>
      ctx.apiConfigs.map((ac) => ({
        name: ac.name,
        endpoint: ac.endpoint,
        method: ac.method,
        headers: ac.headers as Record<string, string>,
        bodyTemplate: ac.bodyTemplate as Record<string, any>,
        isActive: ac.isActive,
      })),
    );

    const { data: searchData } = await firstValueFrom(
      this.httpService.post(`${ragUrl}/api/query/search/multi`, {
        query: dto.content,
        context_ids: contextIds,
        organization_id: organizationId,
        top_k: 5,
      }),
    );

    const topSources: any[] = searchData?.sources || [];

    if (topSources.length === 0) {
      const noAnswer = 'Maaf, saya tidak menemukan jawaban yang relevan dari dokumen yang tersedia.';
      const assistantMessage = await this.prisma.chatMessage.create({
        data: { sessionId, role: 'ASSISTANT', content: noAnswer, references: { sources: [] } },
      });

      return { message: assistantMessage, sources: [], api_results: [] };
    }

    const { data: generateData } = await firstValueFrom(
      this.httpService.post(`${ragUrl}/api/query/generate`, {
        query: dto.content,
        sources: topSources,
        api_configs: allApiConfigs.length > 0 ? allApiConfigs : undefined,
      }),
    );

    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: generateData.answer,
        references: {
          sources: generateData.sources || topSources,
          api_results: generateData.api_results,
        },
      },
    });

    if (session.title === 'New Chat') {
      const title = dto.content.substring(0, 50) + (dto.content.length > 50 ? '...' : '');
      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { title },
      });
    }

    return {
      message: assistantMessage,
      sources: generateData.sources || topSources,
      api_results: generateData.api_results,
    };
  }

  async sendMessageStream(
    organizationId: string,
    sessionId: string,
    userId: string,
    content: string,
    res: Response,
  ) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId, organizationId },
    });
    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    await this.prisma.chatMessage.create({
      data: { sessionId, role: 'USER', content },
    });

    if (session.title === 'New Chat') {
      const title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { title },
      });
    }

    const contexts = await this.prisma.context.findMany({
      where: { organizationId, isActive: true },
    });

    const ragUrl = process.env.RAG_ENGINE_URL || 'http://localhost:8000';
    let topSources: any[] = [];

    if (contexts.length > 0) {
      const contextIds = contexts.map((ctx) => ctx.id);
      try {
        const { data: searchData } = await firstValueFrom(
          this.httpService.post(`${ragUrl}/api/query/search/multi`, {
            query: content,
            context_ids: contextIds,
            organization_id: organizationId,
            top_k: 5,
          }),
        );
        topSources = searchData?.sources || [];
      } catch {}
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    if (topSources.length === 0) {
      const noAnswer = 'Maaf, saya tidak menemukan jawaban yang relevan dari dokumen yang tersedia.';
      res.write(`data: ${JSON.stringify({ type: 'metadata', sources: [], context_used: 0 })}\n\n`);
      res.write(`data: ${noAnswer}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();

      await this.prisma.chatMessage.create({
        data: { sessionId, role: 'ASSISTANT', content: noAnswer, references: { sources: [] } },
      });
      return;
    }

    const metadataSources = topSources.map((s: any) => ({
      document_name: s.document_name,
      score: s.score,
      source_type: s.source_type || 'document',
      source_url: s.source_url || '',
    }));
    res.write(`data: ${JSON.stringify({ type: 'metadata', sources: metadataSources, context_used: topSources.length })}\n\n`);

    let fullAnswer = '';
    try {
      const ragResponse = await fetch(`${ragUrl}/api/query/generate/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: content, sources: topSources }),
      });

      const reader = (ragResponse as any).body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              res.write('data: [DONE]\n\n');
            } else {
              res.write(`${line}\n\n`);
              if (!data.startsWith('{')) {
                fullAnswer += data;
              }
            }
          }
        }
      }
      reader.releaseLock();
    } catch {
      fullAnswer = fullAnswer || 'Maaf, terjadi kesalahan saat memproses jawaban.';
      res.write(`data: ${fullAnswer}\n\n`);
      res.write('data: [DONE]\n\n');
    }

    res.end();

    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: fullAnswer,
        references: { sources: topSources, api_results: null },
      },
    });
  }
}
