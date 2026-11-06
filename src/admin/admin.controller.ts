import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../generated/prisma/enums.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UpdateAdminUserStatusDto } from './dto/update-admin-user-status.dto.js';
import { AdminService } from './admin.service.js';
import { AdminJobPageDto } from './dto/admin-job.dto.js';
import { AdminStatsDto } from './dto/admin-stats.dto.js';
import { AdminUserPageDto } from './dto/admin-user.dto.js';
import { FindAdminJobsQueryDto } from './dto/find-admin-jobs-query.dto.js';
import { FindAdminUsersQueryDto } from './dto/find-admin-users-query.dto.js';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Metricas globales de la plataforma' })
  @ApiOkResponse({ type: AdminStatsDto })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Listar usuarios (paginado y con busqueda)' })
  @ApiOkResponse({ type: AdminUserPageDto })
  findUsers(@Query() query: FindAdminUsersQueryDto) {
    return this.adminService.findUsers(query);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Activar o desactivar la cuenta de un usuario' })
  setUserStatus(
    @CurrentUser('userId') adminId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserStatusDto,
  ) {
    return this.adminService.setUserStatus(id, adminId, dto.isActive);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Eliminar la cuenta de un usuario (cascada)' })
  deleteUser(
    @CurrentUser('userId') adminId: string,
    @Param('id') id: string,
  ) {
    return this.adminService.deleteUser(id, adminId);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Listar publicaciones (paginado y con busqueda)' })
  @ApiOkResponse({ type: AdminJobPageDto })
  findJobs(@Query() query: FindAdminJobsQueryDto) {
    return this.adminService.findJobs(query);
  }

  @Post('jobs/:id/cancel')
  @ApiOperation({ summary: 'Cancelar una publicacion por moderacion' })
  cancelJob(@Param('id') id: string) {
    return this.adminService.cancelJob(id);
  }
}
