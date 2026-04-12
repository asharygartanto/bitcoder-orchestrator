import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientConfigDto } from './dto/update-client-config.dto';
import { UpdateBrandingDto } from './dto/update-client-config.dto';
import * as crypto from 'crypto';

@Injectable()
export class ClientService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateClientDto) {
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = await this.prisma.organization.findFirst({
      where: { slug },
    });
    if (existing) {
      throw new ForbiddenException('Organization slug already exists');
    }

    const org = await this.prisma.organization.create({
      data: { name: dto.name, slug, isActive: true },
    });

    const agentKey = `bc_ag_${crypto.randomBytes(24).toString('hex')}`;

    const client = await this.prisma.client.create({
      data: {
        name: dto.name,
        agentKey,
        organizationId: org.id,
        dbConfig: {
          host: 'localhost',
          port: 5432,
          name: `bitcoder_${slug.replace(/-/g, '_')}`,
          user: 'bitcoder',
          password: crypto.randomBytes(16).toString('hex'),
        },
        aiConfig: {
          apiKey: '',
          baseUrl: process.env.AI_API_BASE_URL || 'https://api.bitcoder.ai/v1',
          chatModel: process.env.AI_CHAT_MODEL || 'bitcoder-chat',
          embeddingModel: process.env.AI_EMBEDDING_MODEL || 'bitcoder-embedding',
          maxTokens: 4096,
          temperature: 0.7,
        },
        storageConfig: {
          uploadDir: './uploads',
          maxFileSize: 52428800,
        },
      },
      include: { organization: true },
    });

    return client;
  }

  async findAll(userRole: string, organizationId: string) {
    if (userRole === 'SUPER_ADMIN') {
      return this.prisma.client.findMany({
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.client.findMany({
      where: { organizationId },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async findOne(id: string, userRole: string, organizationId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!client) throw new NotFoundException('Client not found');
    if (userRole !== 'SUPER_ADMIN' && client.organizationId !== organizationId) {
      throw new ForbiddenException('Access denied');
    }

    return client;
  }

  async findByAgentKey(agentKey: string) {
    return this.prisma.client.findUnique({
      where: { agentKey },
      include: { organization: true },
    });
  }

  async updateConfig(id: string, dto: UpdateClientConfigDto, userRole: string, organizationId: string) {
    const client = await this.findOne(id, userRole, organizationId);

    return this.prisma.client.update({
      where: { id: client.id },
      data: {
        dbConfig: dto.dbConfig !== undefined ? dto.dbConfig : client.dbConfig,
        aiConfig: dto.aiConfig !== undefined ? dto.aiConfig : client.aiConfig,
        storageConfig: dto.storageConfig !== undefined ? dto.storageConfig : client.storageConfig,
      },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async updateStatus(id: string, status: string, healthStatus?: any) {
    return this.prisma.client.update({
      where: { id },
      data: {
        status: status as any,
        lastSeenAt: new Date(),
        ...(healthStatus && { healthStatus }),
      },
    });
  }

  async regenerateKey(id: string, userRole: string, organizationId: string) {
    const client = await this.findOne(id, userRole, organizationId);
    const newKey = `bc_ag_${crypto.randomBytes(24).toString('hex')}`;

    return this.prisma.client.update({
      where: { id: client.id },
      data: { agentKey: newKey },
    });
  }

  async remove(id: string, userRole: string) {
    if (userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admin can delete clients');
    }

    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');

    await this.prisma.client.delete({ where: { id } });
    await this.prisma.organization.delete({ where: { id: client.organizationId } });

    return { success: true };
  }

  async updateBranding(id: string, dto: UpdateBrandingDto, userRole: string, organizationId: string) {
    const client = await this.findOne(id, userRole, organizationId);

    const currentBranding = (client.branding as Record<string, any>) || {};
    const newBranding = {
      title: dto.title !== undefined ? dto.title : currentBranding.title || 'Bitcoder Orchestrator',
      primaryColor: dto.primaryColor !== undefined ? dto.primaryColor : currentBranding.primaryColor || '#157382',
      logoUrl: dto.logoUrl !== undefined ? dto.logoUrl : currentBranding.logoUrl || null,
    };

    return this.prisma.client.update({
      where: { id: client.id },
      data: { branding: newBranding },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async getBrandingForOrg(organizationId: string) {
    const client = await this.prisma.client.findFirst({
      where: { organizationId },
      select: { branding: true },
    });
    return client?.branding || null;
  }

  getInstallCommand(client: any) {
    const cloudUrl = process.env.APP_URL || 'https://orchestrator.gartanto.site';
    return `curl -sSL ${cloudUrl}/api/agent/install.sh | bash -s -- --key=${client.agentKey}`;
  }

  getClientConfig(client: any) {
    return {
      db: client.dbConfig,
      ai: client.aiConfig,
      storage: client.storageConfig,
    };
  }
}
