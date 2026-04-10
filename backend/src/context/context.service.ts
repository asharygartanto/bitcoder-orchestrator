import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContextDto, UpdateContextDto } from './dto/context.dto';

@Injectable()
export class ContextService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateContextDto) {
    return this.prisma.context.create({
      data: {
        name: dto.name,
        description: dto.description,
        organizationId,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.context.findMany({
      where: { organizationId },
      include: {
        _count: { select: { documents: true, apiConfigs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const context = await this.prisma.context.findFirst({
      where: { id, organizationId },
      include: {
        documents: { orderBy: { createdAt: 'desc' } },
        apiConfigs: { orderBy: { createdAt: 'desc' } },
        _count: { select: { documents: true, apiConfigs: true } },
      },
    });
    if (!context) throw new NotFoundException('Context not found');
    return context;
  }

  async update(organizationId: string, id: string, dto: UpdateContextDto) {
    const existing = await this.prisma.context.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Context not found');

    return this.prisma.context.update({
      where: { id },
      data: dto,
    });
  }

  async remove(organizationId: string, id: string) {
    const existing = await this.prisma.context.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Context not found');

    return this.prisma.context.delete({ where: { id } });
  }
}
