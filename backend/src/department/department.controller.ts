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
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentController {
  constructor(private departmentService: DepartmentService) {}

  private getOrgId(req: Request, queryOrgId?: string): string {
    if (queryOrgId && req.user!['role'] === 'SUPER_ADMIN') return queryOrgId;
    return req.user!.organizationId;
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async create(
    @Req() req: Request,
    @Body() dto: CreateDepartmentDto,
    @Query('organizationId') queryOrgId?: string,
  ) {
    return this.departmentService.create(this.getOrgId(req, queryOrgId), dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async findAll(
    @Req() req: Request,
    @Query('organizationId') queryOrgId?: string,
  ) {
    return this.departmentService.findAll(this.getOrgId(req, queryOrgId));
  }

  @Get('tree')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getTree(
    @Req() req: Request,
    @Query('organizationId') queryOrgId?: string,
  ) {
    const orgId = this.getOrgId(req, queryOrgId);
    const departments = await this.departmentService.findAll(orgId);
    const map = new Map(departments.map((d) => [d.id, { ...d, children: [] as any[] }]));
    const tree: any[] = [];

    for (const dept of map.values()) {
      if (dept.parentId && map.has(dept.parentId)) {
        map.get(dept.parentId)!.children.push(dept);
      } else {
        tree.push(dept);
      }
    }

    return tree;
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async findOne(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('organizationId') queryOrgId?: string,
  ) {
    return this.departmentService.findOne(this.getOrgId(req, queryOrgId), id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @Query('organizationId') queryOrgId?: string,
  ) {
    return this.departmentService.update(this.getOrgId(req, queryOrgId), id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async remove(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('organizationId') queryOrgId?: string,
  ) {
    return this.departmentService.remove(this.getOrgId(req, queryOrgId), id);
  }
}
