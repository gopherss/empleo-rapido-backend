import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { UpdateWorkerProfileDto } from './dto/update-worker-profile.dto.js';
import { WorkerCvDto } from './dto/worker-cv.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Workers')
@ApiBearerAuth()
@Controller('workers')
export class WorkersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @Roles(Role.WORKER)
  @ApiOperation({ summary: 'Obtener mi CV de trabajador' })
  @ApiOkResponse({ type: WorkerCvDto })
  getMyProfile(@CurrentUser('userId') userId: string): Promise<WorkerCvDto> {
    return this.usersService.getWorkerProfile(userId);
  }

  @Patch('me')
  @Roles(Role.WORKER)
  @ApiOperation({ summary: 'Actualizar mi CV de trabajador' })
  @ApiOkResponse({ type: WorkerCvDto })
  updateMyProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateWorkerProfileDto,
  ): Promise<WorkerCvDto> {
    return this.usersService.updateWorkerProfile(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver el CV publico de un trabajador' })
  @ApiOkResponse({ type: WorkerCvDto })
  getOne(
    @Param('id') id: string,
    @CurrentUser() user?: { userId: string; role: Role },
  ): Promise<WorkerCvDto> {
    return this.usersService.getWorkerPublicProfile(
      id,
      user?.userId,
      user?.role,
    );
  }
}
