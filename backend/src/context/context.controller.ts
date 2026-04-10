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
import { ContextService } from './context.service';
import { CreateContextDto, UpdateContextDto } from './dto/context.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('contexts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContextController {
  constructor(private contextService: ContextService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async create(@Req() req: Request, @Body() dto: CreateContextDto) {
    return this.contextService.create(req.user!.organizationId, dto);
  }

  @Get()
  async findAll(@Req() req: Request) {
    return this.contextService.findAll(req.user!.organizationId);
  }

  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    return this.contextService.findOne(req.user!.organizationId, id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateContextDto,
  ) {
    return this.contextService.update(req.user!.organizationId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async remove(@Req() req: Request, @Param('id') id: string) {
    return this.contextService.remove(req.user!.organizationId, id);
  }
}
