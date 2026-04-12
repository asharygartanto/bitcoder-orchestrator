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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { LicenseService } from './license.service';
import { CreateLicenseDto, ValidateLicenseDto } from './dto/license.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('licenses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class LicenseController {
  constructor(private licenseService: LicenseService) {}

  @Get()
  async findAll() {
    return this.licenseService.findAll();
  }

  @Get('stats')
  async stats() {
    return this.licenseService.getStats();
  }

  @Post()
  async create(@Body() dto: CreateLicenseDto, @Req() req: any) {
    return this.licenseService.create(req.user.id, dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.licenseService.findOne(id);
  }

  @Post(':id/send')
  async sendEmail(@Param('id') id: string) {
    return this.licenseService.sendToEmail(id);
  }

  @Patch(':id/revoke')
  async revoke(@Param('id') id: string) {
    return this.licenseService.revoke(id);
  }

  @Patch(':id/reactivate')
  async reactivate(@Param('id') id: string) {
    return this.licenseService.reactivate(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.licenseService.remove(id);
  }
}

@Controller('license')
export class LicenseValidateController {
  constructor(private licenseService: LicenseService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validate(@Body() dto: ValidateLicenseDto) {
    return this.licenseService.validate(dto.licenseKey);
  }
}
