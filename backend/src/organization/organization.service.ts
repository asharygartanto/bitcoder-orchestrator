import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.organization.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
        _count: { select: { users: true, contexts: true } },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, contexts: true } },
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.organization.findUnique({
      where: { slug },
    });
  }
}
