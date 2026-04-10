import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateSessionDto, SendMessageDto } from './dto/chat.dto';
import { ApiConfigService } from '../api-config/api-config.service';

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

    let bestAnswer = '';
    let bestSources: any[] = [];
    let bestApiResults: any[] = [];
    let bestScore = -1;

    for (const ctx of contexts) {
      const apiConfigs = ctx.apiConfigs.map((ac) => ({
        name: ac.name,
        endpoint: ac.endpoint,
        method: ac.method,
        headers: ac.headers as Record<string, string>,
        bodyTemplate: ac.bodyTemplate as Record<string, any>,
        isActive: ac.isActive,
      }));

      try {
        const { data } = await firstValueFrom(
          this.httpService.post(`${ragUrl}/api/query`, {
            query: dto.content,
            context_id: ctx.id,
            organization_id: organizationId,
            top_k: 3,
            api_configs: apiConfigs,
          }),
        );

        const topScore = data.sources?.[0]?.score || 0;
        if (topScore > bestScore) {
          bestScore = topScore;
          bestAnswer = data.answer;
          bestSources = data.sources || [];
          bestApiResults = data.api_results || [];
        }
      } catch {}
    }

    if (!bestAnswer) {
      bestAnswer = 'Maaf, saya tidak menemukan jawaban yang relevan dari dokumen yang tersedia.';
    }

    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: bestAnswer,
        references: {
          sources: bestSources,
          api_results: bestApiResults,
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
      sources: bestSources,
      api_results: bestApiResults,
    };
  }
}
