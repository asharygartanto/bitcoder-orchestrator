import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiConfigDto, UpdateApiConfigDto } from './dto/api-config.dto';

@Injectable()
export class ApiConfigService {
  constructor(private prisma: PrismaService) {}

  async create(
    organizationId: string,
    contextId: string,
    userId: string,
    dto: CreateApiConfigDto,
  ) {
    const context = await this.prisma.context.findFirst({
      where: { id: contextId, organizationId },
    });
    if (!context) throw new NotFoundException('Context not found');

    return this.prisma.apiConfig.create({
      data: {
        name: dto.name,
        description: dto.description,
        endpoint: dto.endpoint,
        method: dto.method || 'GET',
        headers: dto.headers || {},
        bodyTemplate: dto.bodyTemplate || {},
        isActive: dto.isActive ?? true,
        contextId,
        organizationId,
        createdById: userId,
      },
    });
  }

  async findAll(organizationId: string, contextId: string) {
    return this.prisma.apiConfig.findMany({
      where: { contextId, organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const config = await this.prisma.apiConfig.findFirst({
      where: { id, organizationId },
    });
    if (!config) throw new NotFoundException('API config not found');
    return config;
  }

  async update(organizationId: string, id: string, dto: UpdateApiConfigDto) {
    const existing = await this.prisma.apiConfig.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('API config not found');

    return this.prisma.apiConfig.update({
      where: { id },
      data: dto,
    });
  }

  async remove(organizationId: string, id: string) {
    const existing = await this.prisma.apiConfig.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('API config not found');

    return this.prisma.apiConfig.delete({ where: { id } });
  }

  async getActiveConfigs(contextId: string) {
    return this.prisma.apiConfig.findMany({
      where: { contextId, isActive: true },
      select: {
        name: true,
        endpoint: true,
        method: true,
        headers: true,
        bodyTemplate: true,
        isActive: true,
      },
    });
  }
}
