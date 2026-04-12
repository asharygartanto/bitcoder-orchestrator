import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { SsoService } from './sso.service';
import { CreateSSOConfigDto } from './dto/sso-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Controller('sso')
export class SsoController {
  constructor(
    private ssoService: SsoService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async getConfig(@Req() req: any) {
    return this.ssoService.getConfig(req.user.organizationId);
  }

  @Post('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async upsertConfig(@Body() dto: CreateSSOConfigDto, @Req() req: any) {
    return this.ssoService.upsertConfig(req.user.organizationId, dto);
  }

  @Patch('config/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async toggleActive(@Body('isActive') isActive: boolean, @Req() req: any) {
    return this.ssoService.toggleActive(req.user.organizationId, isActive);
  }

  @Delete('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async removeConfig(@Req() req: any) {
    return this.ssoService.remove(req.user.organizationId);
  }

  @Get('login/:orgSlug')
  async getSsoLogin(@Param('orgSlug') orgSlug: string) {
    return this.ssoService.getSsoLoginForOrg(orgSlug);
  }

  @Post('callback/:orgSlug')
  async ssoCallback(
    @Param('orgSlug') orgSlug: string,
    @Body() body: { email?: string; name?: string; samlResponse?: string; code?: string },
    @Res() res: Response,
  ) {
    const org = await this.prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) {
      return res.redirect('/login?error=sso_failed');
    }

    const email = body.email;
    if (!email) {
      return res.redirect('/login?error=sso_no_email');
    }

    let user = await this.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: body.name || email.split('@')[0],
          role: 'USER',
          organizationId: org.id,
        },
        include: { organization: true },
      });
    }

    if (user.organizationId !== org.id) {
      return res.redirect('/login?error=sso_wrong_org');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const token = this.jwtService.sign(payload);
    const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173';

    return res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
}
