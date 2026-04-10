import { Controller, Get, Param, UseGuards } from '@nestjs/common';
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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.orgService.findOne(id);
  }
}
