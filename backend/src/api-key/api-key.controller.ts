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
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto/api-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class ApiKeyController {
  constructor(private apiKeyService: ApiKeyService) {}

  @Get()
  async findAll(@Req() req: any) {
    return this.apiKeyService.findAll(req.user.organizationId);
  }

  @Post()
  async create(@Body() dto: CreateApiKeyDto, @Req() req: any) {
    return this.apiKeyService.create(req.user.organizationId, req.user.id, dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.apiKeyService.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateApiKeyDto, @Req() req: any) {
    return this.apiKeyService.update(id, req.user.organizationId, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.apiKeyService.remove(id, req.user.organizationId);
  }
}
