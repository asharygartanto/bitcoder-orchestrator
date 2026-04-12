import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { Request } from 'express';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientConfigDto, UpdateBrandingDto } from './dto/update-client-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientController {
  constructor(private clientService: ClientService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async findAll(@Req() req: any) {
    return this.clientService.findAll(req.user.role, req.user.organizationId);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  async create(@Body() dto: CreateClientDto) {
    const client = await this.clientService.create(dto);
    return {
      ...client,
      installCommand: this.clientService.getInstallCommand(client),
    };
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async findOne(@Param('id') id: string, @Req() req: any) {
    const client = await this.clientService.findOne(id, req.user.role, req.user.organizationId);
    return {
      ...client,
      installCommand: this.clientService.getInstallCommand(client),
    };
  }

  @Patch(':id/config')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async updateConfig(
    @Param('id') id: string,
    @Body() dto: UpdateClientConfigDto,
    @Req() req: any,
  ) {
    return this.clientService.updateConfig(id, dto, req.user.role, req.user.organizationId);
  }

  @Patch(':id/branding')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async updateBranding(
    @Param('id') id: string,
    @Body() dto: UpdateBrandingDto,
    @Req() req: any,
  ) {
    return this.clientService.updateBranding(id, dto, req.user.role, req.user.organizationId);
  }

  @Post(':id/regenerate-key')
  @Roles(UserRole.SUPER_ADMIN)
  async regenerateKey(@Param('id') id: string, @Req() req: any) {
    const client = await this.clientService.regenerateKey(id, req.user.role, req.user.organizationId);
    return {
      ...client,
      installCommand: this.clientService.getInstallCommand(client),
    };
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.clientService.remove(id, req.user.role);
  }
}

@Controller('branding')
@UseGuards(JwtAuthGuard)
export class BrandingController {
  constructor(private clientService: ClientService) {}

  @Get()
  async getMyBranding(@Req() req: any) {
    return this.clientService.getBrandingForOrg(req.user.organizationId);
  }
}
