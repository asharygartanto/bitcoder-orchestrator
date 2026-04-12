import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSSOConfigDto } from './dto/sso-config.dto';

@Injectable()
export class SsoService {
  constructor(private prisma: PrismaService) {}

  async getConfig(organizationId: string) {
    return this.prisma.sSOConfig.findUnique({
      where: { organizationId },
    });
  }

  async upsertConfig(organizationId: string, dto: CreateSSOConfigDto) {
    return this.prisma.sSOConfig.upsert({
      where: { organizationId },
      create: {
        name: dto.name,
        protocol: dto.protocol as any,
        isActive: dto.isActive ?? false,
        organizationId,
        entryPoint: dto.entryPoint,
        certificate: dto.certificate,
        issuer: dto.issuer,
        clientId: dto.clientId,
        clientSecret: dto.clientSecret,
        discoveryUrl: dto.discoveryUrl,
      },
      update: {
        name: dto.name,
        protocol: dto.protocol as any,
        isActive: dto.isActive ?? false,
        entryPoint: dto.entryPoint,
        certificate: dto.certificate,
        issuer: dto.issuer,
        clientId: dto.clientId,
        clientSecret: dto.clientSecret,
        discoveryUrl: dto.discoveryUrl,
      },
    });
  }

  async toggleActive(organizationId: string, isActive: boolean) {
    const config = await this.prisma.sSOConfig.findUnique({ where: { organizationId } });
    if (!config) throw new NotFoundException('SSO config not found');

    return this.prisma.sSOConfig.update({
      where: { organizationId },
      data: { isActive },
    });
  }

  async remove(organizationId: string) {
    const config = await this.prisma.sSOConfig.findUnique({ where: { organizationId } });
    if (!config) throw new NotFoundException('SSO config not found');

    await this.prisma.sSOConfig.delete({ where: { organizationId } });
    return { success: true };
  }

  async getSsoLoginForOrg(orgSlug: string) {
    const org = await this.prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return null;

    const config = await this.prisma.sSOConfig.findUnique({ where: { organizationId: org.id } });
    if (!config || !config.isActive) return null;

    return {
      name: config.name,
      protocol: config.protocol,
      entryPoint: config.entryPoint,
      issuer: config.issuer,
      clientId: config.clientId,
      discoveryUrl: config.discoveryUrl,
    };
  }

  async handleSamlCallback(orgSlug: string, samlResponse: string) {
    const org = await this.prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return null;

    const config = await this.prisma.sSOConfig.findUnique({ where: { organizationId: org.id } });
    if (!config || !config.isActive) return null;

    return {
      organizationId: org.id,
      organizationName: org.name,
      protocol: config.protocol,
    };
  }
}
