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

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async create(@Req() req: Request, @Body() dto: CreateDepartmentDto) {
    return this.departmentService.create(req.user!.organizationId, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async findAll(@Req() req: Request) {
    return this.departmentService.findAll(req.user!.organizationId);
  }

  @Get('tree')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getTree(@Req() req: Request) {
    const departments = await this.departmentService.findAll(req.user!.organizationId);
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
  async findOne(@Req() req: Request, @Param('id') id: string) {
    return this.departmentService.findOne(req.user!.organizationId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentService.update(req.user!.organizationId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async remove(@Req() req: Request, @Param('id') id: string) {
    return this.departmentService.remove(req.user!.organizationId, id);
  }
}
