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
        contextId: dto.contextId,
      },
    });
  }

  async findSessions(organizationId: string, userId: string) {
    return this.prisma.chatSession.findMany({
      where: { userId, organizationId },
      include: { context: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findSession(organizationId: string, sessionId: string, userId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId, organizationId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        context: { select: { id: true, name: true } },
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

    const contextId = dto.contextId || session.contextId;
    if (!contextId) {
      throw new NotFoundException('No context selected for this chat');
    }

    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'USER',
        content: dto.content,
      },
    });

    const apiConfigs = await this.apiConfigService.getActiveConfigs(contextId);
    const ragUrl = process.env.RAG_ENGINE_URL || 'http://localhost:8000';

    const { data } = await firstValueFrom(
      this.httpService.post(`${ragUrl}/api/query`, {
        query: dto.content,
        context_id: contextId,
        organization_id: organizationId,
        top_k: 5,
        api_configs: apiConfigs,
      }),
    );

    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: data.answer,
        references: {
          sources: data.sources,
          api_results: data.api_results,
        },
      },
    });

    if (session.title === 'New Chat') {
      const title = dto.content.substring(0, 50) + (dto.content.length > 50 ? '...' : '');
      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { title, contextId },
      });
    }

    return {
      message: assistantMessage,
      sources: data.sources,
      api_results: data.api_results,
    };
  }
}
