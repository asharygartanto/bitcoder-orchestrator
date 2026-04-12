import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(private orgService: OrganizationService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  async findAll() {
    return this.orgService.findAll();
  }

  @Get('tree')
  async getTree(@Req() req: any) {
    if (req.user.role === 'SUPER_ADMIN') {
      return this.orgService.getFullTree();
    }
    return this.orgService.getTreeForOrg(req.user.organizationId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.orgService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async create(@Body() body: { name: string; slug?: string; parentId?: string }, @Req() req: any) {
    if (req.user.role === 'ADMIN' && body.parentId !== req.user.organizationId) {
      body.parentId = req.user.organizationId;
    }
    return this.orgService.create(body);
  }

  @Post(':id/users')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async addUser(
    @Param('id') id: string,
    @Body() body: { email: string; name: string; password: string; role?: string },
    @Req() req: any,
  ) {
    if (req.user.role === 'ADMIN' && id !== req.user.organizationId) {
      return { error: 'Can only add users to your own organization' };
    }
    return this.orgService.addUser(id, body);
  }

  @Get(':id/users')
  async getUsers(@Param('id') id: string, @Req() req: any) {
    if (req.user.role !== 'SUPER_ADMIN' && id !== req.user.organizationId) {
      return { error: 'Access denied' };
    }
    return this.orgService.getUsers(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean },
    @Req() req: any,
  ) {
    if (req.user.role === 'ADMIN' && id !== req.user.organizationId) {
      return { error: 'Access denied' };
    }
    return this.orgService.update(id, body);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async remove(@Param('id') id: string) {
    return this.orgService.remove(id);
  }
}
