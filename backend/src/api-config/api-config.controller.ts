import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiConfigService } from './api-config.service';
import { CreateApiConfigDto, UpdateApiConfigDto } from './dto/api-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('api-configs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApiConfigController {
  constructor(private apiConfigService: ApiConfigService) {}

  @Post(':contextId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async create(
    @Req() req: Request,
    @Param('contextId') contextId: string,
    @Body() dto: CreateApiConfigDto,
  ) {
    return this.apiConfigService.create(
      req.user!.organizationId,
      contextId,
      req.user!.id,
      dto,
    );
  }

  @Get('context/:contextId')
  async findByContext(
    @Req() req: Request,
    @Param('contextId') contextId: string,
  ) {
    return this.apiConfigService.findAll(req.user!.organizationId, contextId);
  }

  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    return this.apiConfigService.findOne(req.user!.organizationId, id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateApiConfigDto,
  ) {
    return this.apiConfigService.update(req.user!.organizationId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async remove(@Req() req: Request, @Param('id') id: string) {
    return this.apiConfigService.remove(req.user!.organizationId, id);
  }
}
