import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateLicenseDto } from './dto/license.dto';
import * as crypto from 'crypto';

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  private generateLicenseKey(): string {
    const segments: string[] = [];
    for (let i = 0; i < 4; i++) {
      segments.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return `BC-${segments.join('-')}`;
  }

  private calculateExpiry(startDate: Date, duration: string, customExpiry?: string): Date {
    const start = new Date(startDate);
    switch (duration) {
      case 'ONE_WEEK':
        return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'ONE_MONTH':
        const month = new Date(start);
        month.setMonth(month.getMonth() + 1);
        return month;
      case 'ONE_YEAR':
        const year = new Date(start);
        year.setFullYear(year.getFullYear() + 1);
        return year;
      case 'CUSTOM':
        if (!customExpiry) throw new BadRequestException('Custom expiry date required');
        return new Date(customExpiry);
      default:
        throw new BadRequestException('Invalid duration');
    }
  }

  async create(userId: string, dto: CreateLicenseDto) {
    const key = this.generateLicenseKey();
    const startDate = new Date(dto.startDate);
    const expiresAt = this.calculateExpiry(startDate, dto.duration, dto.expiresAt);

    if (expiresAt <= startDate) {
      throw new BadRequestException('Expiry date must be after start date');
    }

    const existingAlias = await this.prisma.license.findFirst({
      where: { companyAlias: dto.companyAlias, status: { not: 'REVOKED' } },
    });
    if (existingAlias) {
      throw new BadRequestException(`Alias "${dto.companyAlias}" sudah digunakan`);
    }

    const license = await this.prisma.license.create({
      data: {
        key,
        companyName: dto.companyName,
        companyAlias: dto.companyAlias,
        contactEmail: dto.contactEmail,
        contactName: dto.contactName,
        phone: dto.phone,
        duration: dto.duration as any,
        status: 'PENDING',
        startDate,
        expiresAt,
        createdById: userId,
        notes: dto.notes,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return license;
  }

  async findAll() {
    return this.prisma.license.findMany({
      select: {
        id: true,
        key: true,
        companyName: true,
        companyAlias: true,
        contactEmail: true,
        contactName: true,
        phone: true,
        duration: true,
        status: true,
        startDate: true,
        expiresAt: true,
        activatedAt: true,
        lastValidatedAt: true,
        notes: true,
        createdAt: true,
        organization: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const license = await this.prisma.license.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!license) throw new NotFoundException('License not found');
    return license;
  }

  async validate(licenseKey: string) {
    const license = await this.prisma.license.findUnique({
      where: { key: licenseKey },
    });

    if (!license) {
      return { valid: false, error: 'License key tidak ditemukan' };
    }

    if (license.status === 'REVOKED') {
      return { valid: false, error: 'License telah dicabut' };
    }

    const now = new Date();

    if (license.status === 'PENDING' && now >= license.startDate) {
      await this.prisma.license.update({
        where: { id: license.id },
        data: { status: 'ACTIVE', activatedAt: now },
      });
      license.status = 'ACTIVE' as any;
      license.activatedAt = now;
    }

    if (now < license.startDate) {
      return {
        valid: false,
        error: `License belum aktif. Berlaku mulai ${license.startDate.toLocaleDateString('id-ID')}`,
        startDate: license.startDate,
      };
    }

    if (now > license.expiresAt) {
      await this.prisma.license.update({
        where: { id: license.id },
        data: { status: 'EXPIRED' },
      });
      return { valid: false, error: 'License telah kadaluarsa', expiresAt: license.expiresAt };
    }

    await this.prisma.license.update({
      where: { id: license.id },
      data: { lastValidatedAt: now },
    });

    return {
      valid: true,
      license: {
        id: license.id,
        companyName: license.companyName,
        companyAlias: license.companyAlias,
        duration: license.duration,
        startDate: license.startDate,
        expiresAt: license.expiresAt,
        activatedAt: license.activatedAt,
        status: 'ACTIVE',
      },
    };
  }

  async sendToEmail(id: string) {
    const license = await this.findOne(id);
    if (!license) throw new NotFoundException('License not found');

    const cloudUrl = process.env.APP_URL || 'https://orchestrator.gartanto.site';
    const installCmd = `curl -sSL ${cloudUrl}/api/agent/install.sh | bash -s -- --key=YOUR_AGENT_KEY --license=${license.key}`;

    await this.emailService.sendLicenseEmail(
      license.contactEmail,
      license.contactName || license.companyName,
      license.key,
      license.companyName,
      license.startDate,
      license.expiresAt,
      license.duration,
      installCmd,
      cloudUrl,
    );

    return { success: true, sentTo: license.contactEmail };
  }

  async revoke(id: string) {
    const license = await this.findOne(id);
    return this.prisma.license.update({
      where: { id: license.id },
      data: { status: 'REVOKED' },
    });
  }

  async reactivate(id: string) {
    const license = await this.findOne(id);
    const now = new Date();
    const status = now > license.expiresAt ? 'EXPIRED' : 'ACTIVE';
    return this.prisma.license.update({
      where: { id: license.id },
      data: { status: status as any },
    });
  }

  async remove(id: string) {
    const license = await this.findOne(id);
    await this.prisma.license.delete({ where: { id: license.id } });
    return { success: true };
  }

  async getStats() {
    const [total, active, expired, pending, revoked] = await Promise.all([
      this.prisma.license.count(),
      this.prisma.license.count({ where: { status: 'ACTIVE' } }),
      this.prisma.license.count({ where: { status: 'EXPIRED' } }),
      this.prisma.license.count({ where: { status: 'PENDING' } }),
      this.prisma.license.count({ where: { status: 'REVOKED' } }),
    ]);

    const expiringSoon = await this.prisma.license.count({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    return { total, active, expired, pending, revoked, expiringSoon };
  }
}
