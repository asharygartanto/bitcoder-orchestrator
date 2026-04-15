import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import {
  CreateUserDto,
  BulkCreateUsersDto,
  UpdateUserDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async findAll(@Req() req: any, @Query('organizationId') queryOrgId?: string) {
    const orgId = (queryOrgId && req.user.role === 'SUPER_ADMIN') ? queryOrgId : req.user.organizationId;
    return this.userService.findAll(orgId);
  }

  @Get('monitor/all')
  @Roles(UserRole.SUPER_ADMIN)
  async monitorAll(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('orgId') orgId?: string,
  ) {
    return this.userService.monitorAllUsers({ search, role, orgId });
  }

  @Get('monitor/org')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async monitorOrg(@Req() req: any) {
    return this.userService.monitorOrgUsers(req.user.organizationId);
  }

  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN)
  async stats() {
    return this.userService.getStats();
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async create(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.userService.create(req.user.organizationId, dto, req.user.role);
  }

  @Post('bulk')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async bulkCreate(@Body() dto: BulkCreateUsersDto, @Req() req: any) {
    return this.userService.bulkCreate(req.user.organizationId, dto, req.user.role);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.userService.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: any) {
    return this.userService.update(id, req.user.organizationId, dto);
  }

  @Post(':id/reset-password')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async resetPassword(@Param('id') id: string, @Req() req: any) {
    return this.userService.resetUserPassword(id, req.user.organizationId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.userService.remove(id, req.user.organizationId);
  }
}

@Controller('auth')
export class AuthUserController {
  constructor(private userService: UserService) {}

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.userService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.userService.resetPassword(dto.token, dto.password);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(req.user.id, dto.currentPassword, dto.password);
  }
}
