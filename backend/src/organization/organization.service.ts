import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

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
        parentId: true,
        createdAt: true,
        _count: { select: { users: true, contexts: true } },
        client: { select: { id: true, status: true, lastSeenAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true, isActive: true } },
        _count: { select: { users: true, contexts: true } },
        client: { select: { id: true, status: true, lastSeenAt: true, healthStatus: true } },
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.organization.findUnique({
      where: { slug },
    });
  }

  async create(dto: { name: string; slug?: string; parentId?: string }) {
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = await this.prisma.organization.findFirst({ where: { slug } });
    if (existing) {
      throw new ConflictException('Organization slug already exists');
    }

    if (dto.parentId) {
      const parent = await this.prisma.organization.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent organization not found');
    }

    return this.prisma.organization.create({
      data: {
        name: dto.name,
        slug,
        parentId: dto.parentId || null,
      },
    });
  }

  async update(id: string, dto: { name?: string; isActive?: boolean }) {
    return this.prisma.organization.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: { children: true, client: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    if (org.client) {
      await this.prisma.client.delete({ where: { id: org.client.id } });
    }
    return this.prisma.organization.delete({ where: { id } });
  }

  async getFullTree() {
    const orgs = await this.prisma.organization.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        client: { select: { id: true, status: true } },
        _count: { select: { users: true, children: true } },
      },
      orderBy: { name: 'asc' },
    });

    return this.buildTree(orgs);
  }

  async getTreeForOrg(organizationId: string) {
    const rootOrg = await this.findRootOrg(organizationId);

    const orgs = await this.prisma.organization.findMany({
      where: {
        OR: [
          { id: rootOrg.id },
          { parentId: rootOrg.id },
        ],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        _count: { select: { users: true, children: true } },
      },
      orderBy: { name: 'asc' },
    });

    return this.buildTree(orgs);
  }

  async addUser(orgId: string, dto: { email: string; name: string; password: string; role?: string }) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: (dto.role as any) || 'USER',
        organizationId: orgId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async getUsers(orgId: string) {
    return this.prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findRootOrg(organizationId: string) {
    let current = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    while (current?.parentId) {
      current = await this.prisma.organization.findUnique({ where: { id: current.parentId } });
    }
    return current!;
  }

  private buildTree(orgs: any[]): any[] {
    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const org of orgs) {
      map.set(org.id, { ...org, children: [] });
    }

    for (const org of orgs) {
      if (org.parentId && map.has(org.parentId)) {
        map.get(org.parentId)!.children.push(map.get(org.id));
      } else {
        roots.push(map.get(org.id));
      }
    }

    return roots;
  }
}
