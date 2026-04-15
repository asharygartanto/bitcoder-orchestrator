import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../rag/rag.service';
import { ApiConfigService } from '../api-config/api-config.service';
import { AuthService } from '../auth/auth.service';
import { ChatService } from '../chat/chat.service';
import { DepartmentService } from '../department/department.service';
import * as bcrypt from 'bcrypt';

@Controller('public')
@UseGuards(ApiKeyGuard)
export class PublicApiController {
  constructor(
    private prisma: PrismaService,
    private ragService: RagService,
    private apiConfigService: ApiConfigService,
    private authService: AuthService,
    private chatService: ChatService,
    private departmentService: DepartmentService,
  ) {}

  @Get('info')
  async getInfo(@Req() req: any) {
    const org = await this.prisma.organization.findUnique({
      where: { id: req.apiKey.organizationId },
      select: { id: true, name: true, slug: true },
    });
    return {
      service: 'Bitcoder AI Orchestrator',
      version: '1.0.0',
      organization: org,
      endpoints: {
        'POST /api/public/auth/login': 'Login dengan email & password, dapatkan token',
        'POST /api/public/chat': 'Kirim pesan chat dan dapatkan jawaban AI',
        'POST /api/public/chat/stream': 'Kirim pesan chat dengan streaming response',
        'GET  /api/public/contexts': 'List semua knowledge context',
        'GET  /api/public/contexts/:id': 'Detail context beserta dokumen dan API config',
        'GET  /api/public/health': 'Cek status koneksi',
      },
    };
  }

  @Get('health')
  async health(@Req() req: any) {
    return {
      status: 'ok',
      organizationId: req.apiKey.organizationId,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('auth/login')
  async login(@Req() req: any, @Body() body: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
      include: { organization: true },
    });

    if (!user || !user.passwordHash) {
      return { success: false, error: 'Invalid credentials' };
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return { success: false, error: 'Invalid credentials' };
    }

    if (!user.isActive || user.organizationId !== req.apiKey.organizationId) {
      return { success: false, error: 'Access denied' };
    }

    const token = await this.authService.generateTokenForUser(user);

    return {
      success: true,
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
        position: user.position,
      },
    };
  }

  @Get('contexts')
  async getContexts(@Req() req: any) {
    return this.prisma.context.findMany({
      where: { organizationId: req.apiKey.organizationId, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        _count: { select: { documents: true, apiConfigs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('contexts/:id')
  async getContext(@Req() req: any, @Param('id') id: string) {
    const context = await this.prisma.context.findFirst({
      where: { id, organizationId: req.apiKey.organizationId, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        documents: {
          select: { id: true, name: true, fileType: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        apiConfigs: {
          select: { id: true, name: true, endpoint: true, method: true, isActive: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!context) return { error: 'Context not found' };
    return context;
  }

  @Post('chat')
  async chat(
    @Req() req: any,
    @Body() body: { message: string; contextId?: string; sessionId?: string; userId?: string },
  ) {
    if (body.userId) {
      const caller = await this.prisma.user.findUnique({
        where: { id: body.userId },
        select: { id: true, departmentId: true, organizationId: true },
      });

      if (!caller || caller.organizationId !== req.apiKey.organizationId) {
        throw new ForbiddenException('Access denied');
      }
    }

    const { message, contextId } = body;

    const contexts = await this.prisma.context.findMany({
      where: {
        organizationId: req.apiKey.organizationId,
        isActive: true,
        ...(contextId && { id: contextId }),
      },
      include: { apiConfigs: { where: { isActive: true } } },
    });

    if (contexts.length === 0) {
      return { error: 'No active contexts found' };
    }

    let bestAnswer = '';
    let bestSources: any[] = [];
    let bestApiResults: any[] = [];
    let bestScore = -1;

    for (const ctx of contexts) {
      try {
        const result = await this.ragService.query(
          message,
          ctx.id,
          req.apiKey.organizationId,
          5,
        );

        const topScore = result?.sources?.[0]?.score || 0;
        if (topScore > bestScore) {
          bestScore = topScore;
          bestAnswer = result?.answer || '';
          bestSources = result?.sources || [];
          bestApiResults = result?.api_results || [];
        }
      } catch {}
    }

    if (!bestAnswer) {
      bestAnswer = 'Maaf, saya tidak menemukan jawaban yang relevan.';
    }

    return {
      answer: bestAnswer,
      sources: bestSources,
      api_results: bestApiResults,
      context_id: contextId || contexts[0]?.id,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('departments')
  async getDepartments(@Req() req: any) {
    return this.departmentService.findAll(req.apiKey.organizationId);
  }

  @Post('check-access')
  async checkAccess(
    @Req() req: any,
    @Body() body: { userId: string; targetUserId: string },
  ) {
    const caller = await this.prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true, departmentId: true, organizationId: true },
    });

    const target = await this.prisma.user.findUnique({
      where: { id: body.targetUserId },
      select: { id: true, departmentId: true, organizationId: true },
    });

    if (!caller || !target) {
      return { canAccess: false, reason: 'User not found' };
    }

    if (caller.organizationId !== req.apiKey.organizationId || target.organizationId !== req.apiKey.organizationId) {
      return { canAccess: false, reason: 'Different organization' };
    }

    if (!caller.departmentId || !target.departmentId) {
      return { canAccess: false, reason: 'User not assigned to department' };
    }

    const canAccess = await this.departmentService.canUserAccessDepartment(
      caller.departmentId,
      target.departmentId,
      req.apiKey.organizationId,
    );

    return { canAccess };
  }

  @Get('department/:id/users')
  async getDepartmentUsers(@Req() req: any, @Param('id') deptId: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id: deptId, organizationId: req.apiKey.organizationId },
    });

    if (!dept) {
      return { error: 'Department not found' };
    }

    const descendantIds = await this.departmentService.getDescendantIds(
      deptId,
      req.apiKey.organizationId,
    );

    const users = await this.prisma.user.findMany({
      where: {
        organizationId: req.apiKey.organizationId,
        departmentId: { in: descendantIds },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        position: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return { departmentId: deptId, departmentName: dept.name, users };
  }

  @Post('chat/stream')
  async chatStream(
    @Req() req: any,
    @Body() body: { message: string; contextId?: string },
    @Res() res: Response,
  ) {
    const { message, contextId } = body;

    const contexts = await this.prisma.context.findMany({
      where: {
        organizationId: req.apiKey.organizationId,
        isActive: true,
        ...(contextId && { id: contextId }),
      },
    });

    if (contexts.length === 0) {
      res.json({ error: 'No active contexts found' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const generator = this.ragService.queryStream(
        message,
        contextId || contexts[0].id,
        req.apiKey.organizationId,
        5,
      );

      for await (const chunk of generator) {
        res.write(`data: ${chunk}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
}
