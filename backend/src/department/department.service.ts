import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@Injectable()
export class DepartmentService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateDepartmentDto) {
    if (dto.parentId) {
      const parent = await this.prisma.department.findFirst({
        where: { id: dto.parentId, organizationId },
      });
      if (!parent) throw new NotFoundException('Parent department not found');
    }

    return this.prisma.department.create({
      data: {
        name: dto.name,
        description: dto.description,
        organizationId,
        parentId: dto.parentId || null,
        level: dto.level ?? 0,
      },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { users: true, children: true } },
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.department.findMany({
      where: { organizationId },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { users: true, children: true } },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(organizationId: string, id: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, organizationId },
      include: {
        parent: { select: { id: true, name: true } },
        children: { include: { _count: { select: { users: true, children: true } } } },
        users: {
          select: { id: true, name: true, email: true, position: true, role: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async update(organizationId: string, id: string, dto: UpdateDepartmentDto) {
    const dept = await this.prisma.department.findFirst({
      where: { id, organizationId },
    });
    if (!dept) throw new NotFoundException('Department not found');

    if (dto.parentId === id) {
      throw new BadRequestException('Department cannot be its own parent');
    }

    if (dto.parentId) {
      const isDescendant = await this.isDescendant(id, dto.parentId, organizationId);
      if (isDescendant) {
        throw new BadRequestException('Cannot set a descendant as parent (would create circular reference)');
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId || null }),
        ...(dto.level !== undefined && { level: dto.level }),
      },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { users: true, children: true } },
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { children: true, users: true } } },
    });
    if (!dept) throw new NotFoundException('Department not found');

    if (dept._count.children > 0) {
      throw new BadRequestException('Cannot delete department with child departments. Move or delete children first.');
    }

    if (dept._count.users > 0) {
      await this.prisma.user.updateMany({
        where: { departmentId: id },
        data: { departmentId: null },
      });
    }

    return this.prisma.department.delete({ where: { id } });
  }

  async getDescendantIds(departmentId: string, organizationId: string): Promise<string[]> {
    const ids: string[] = [departmentId];
    const queue = [departmentId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await this.prisma.department.findMany({
        where: { parentId: currentId, organizationId },
        select: { id: true },
      });
      for (const child of children) {
        ids.push(child.id);
        queue.push(child.id);
      }
    }

    return ids;
  }

  async canUserAccessDepartment(
    userDepartmentId: string | null,
    targetDepartmentId: string,
    organizationId: string,
  ): Promise<boolean> {
    if (!userDepartmentId) return false;
    if (userDepartmentId === targetDepartmentId) return true;

    const descendants = await this.getDescendantIds(userDepartmentId, organizationId);
    return descendants.includes(targetDepartmentId);
  }

  private async isDescendant(ancestorId: string, checkId: string, organizationId: string): Promise<boolean> {
    const descendants = await this.getDescendantIds(ancestorId, organizationId);
    return descendants.includes(checkId);
  }
}
