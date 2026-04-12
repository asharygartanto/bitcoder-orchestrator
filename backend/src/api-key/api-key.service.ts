import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto/api-key.dto';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, userId: string, dto: CreateApiKeyDto) {
    const rawKey = `bc_${crypto.randomBytes(32).toString('hex')}`;
    const prefix = rawKey.substring(0, 8);
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: dto.name,
        key: hashedKey,
        prefix,
        organizationId,
        createdById: userId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      ...apiKey,
      key: rawKey,
    };
  }

  async findAll(organizationId: string) {
    return this.prisma.apiKey.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        prefix: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, organizationId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!apiKey) throw new NotFoundException('API key not found');
    return apiKey;
  }

  async update(id: string, organizationId: string, dto: UpdateApiKeyDto) {
    await this.findOne(id, organizationId);
    return this.prisma.apiKey.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    await this.prisma.apiKey.delete({ where: { id } });
    return { success: true };
  }

  async validateKey(rawKey: string): Promise<{ organizationId: string; apiKeyId: string } | null> {
    if (!rawKey || !rawKey.startsWith('bc_')) return null;

    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key: hashedKey },
    });

    if (!apiKey) return null;
    if (!apiKey.isActive) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      organizationId: apiKey.organizationId,
      apiKeyId: apiKey.id,
    };
  }
}
