import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateUserDto, BulkCreateUsersDto, UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  private generatePassword(length = 12): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async findAll(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(organizationId: string, dto: CreateUserDto, createdByRole: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException(`Email ${dto.email} sudah terdaftar`);

    if (dto.role === 'SUPER_ADMIN' && createdByRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Hanya Super Admin yang bisa membuat Super Admin');
    }

    const password = dto.password || this.generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: (dto.role as any) || 'USER',
        organizationId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    const loginUrl = `${process.env.APP_URL || 'https://orchestrator.gartanto.site'}/login`;

    await this.emailService.sendPasswordEmail(
      dto.email,
      dto.name,
      password,
      loginUrl,
      org?.name || 'Bitcoder',
    );

    return { ...user, generatedPassword: dto.password ? undefined : password };
  }

  async bulkCreate(organizationId: string, dto: BulkCreateUsersDto, createdByRole: string) {
    const results: any[] = [];

    for (const userDto of dto.users) {
      try {
        const result = await this.create(organizationId, userDto, createdByRole);
        results.push({ ...result, email: userDto.email, status: 'created' });
      } catch (err: any) {
        results.push({ email: userDto.email, status: 'error', error: err.message });
      }
    }

    return results;
  }

  async update(id: string, organizationId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({ where: { id, organizationId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.role !== undefined && { role: dto.role as any }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async remove(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, organizationId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'SUPER_ADMIN') throw new ForbiddenException('Cannot delete Super Admin');

    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  async resetUserPassword(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, organizationId } });
    if (!user) throw new NotFoundException('User not found');

    const password = this.generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    const loginUrl = `${process.env.APP_URL || 'https://orchestrator.gartanto.site'}/login`;

    await this.emailService.sendPasswordEmail(
      user.email,
      user.name || user.email,
      password,
      loginUrl,
      org?.name || 'Bitcoder',
    );

    return { success: true, generatedPassword: password };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { success: true };

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordReset.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const org = await this.prisma.organization.findUnique({ where: { id: user.organizationId } });
    const resetUrl = `${process.env.APP_URL || 'https://orchestrator.gartanto.site'}/reset-password?token=${token}`;

    await this.emailService.sendPasswordResetEmail(
      email,
      user.name || email,
      resetUrl,
      org?.name || 'Bitcoder',
    );

    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!reset) throw new BadRequestException('Token tidak valid');
    if (reset.usedAt) throw new BadRequestException('Token sudah digunakan');
    if (reset.expiresAt < new Date()) throw new BadRequestException('Token sudah kadaluarsa');

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash },
    });

    await this.prisma.passwordReset.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    });

    return { success: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) throw new BadRequestException('User tidak valid');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Password saat ini salah');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  }

  async monitorAllUsers(filters?: { search?: string; role?: string; orgId?: string }) {
    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.role) where.role = filters.role;
    if (filters?.orgId) where.organizationId = filters.orgId;

    const [users, counts] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
    ]);

    const totalUsers = await this.prisma.user.count();
    const activeUsers = await this.prisma.user.count({ where: { isActive: true } });
    const recentLogins = await this.prisma.user.count({
      where: { lastLoginAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    });

    const roleCounts: Record<string, number> = {};
    for (const c of counts) {
      roleCounts[c.role] = c._count.id;
    }

    return {
      users,
      stats: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        recentLogins7d: recentLogins,
        byRole: roleCounts,
      },
    };
  }

  async monitorOrgUsers(organizationId: string) {
    const [users, client] = await Promise.all([
      this.prisma.user.findMany({
        where: { organizationId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.findFirst({
        where: { organizationId },
        select: {
          id: true,
          name: true,
          status: true,
          lastSeenAt: true,
          organization: { select: { name: true, slug: true } },
        },
      }),
    ]);

    return { users, client };
  }

  async getStats() {
    const [total, active, orgs] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.organization.count({ where: { isActive: true } }),
    ]);

    return { total, active, inactive: total - active, organizations: orgs };
  }
}
