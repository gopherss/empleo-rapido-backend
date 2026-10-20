import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { photoUploadInterceptor } from '../common/upload/image-upload.js';
import { Role } from '../generated/prisma/enums.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import {
  JobDetailDto,
  JobListPageDto,
} from './dto/job-response.dto.js';
import { QueryJobsDto } from './dto/query-jobs.dto.js';
import { QueryMyJobsDto } from './dto/query-my-jobs.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';
import { JobsService } from './jobs.service.js';

const MAX_JOB_PHOTOS = 3;

const photoUpload = photoUploadInterceptor(MAX_JOB_PHOTOS);

@ApiTags('Jobs')
@ApiBearerAuth()
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @Roles(Role.HOMEOWNER)
  @UseInterceptors(photoUpload)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Publicar un trabajo (hasta 3 fotos)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
        city: { type: 'string' },
        address: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        budget: { type: 'number' },
        photos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['title', 'description', 'category', 'city', 'latitude', 'longitude'],
    },
  })
  @ApiCreatedResponse({ type: JobDetailDto })
  create(
    @CurrentUser('userId') homeownerId: string,
    @Body() dto: CreateJobDto,
    @UploadedFiles() photos: Express.Multer.File[],
  ): Promise<JobDetailDto> {
    return this.jobsService.create(homeownerId, dto, photos ?? []);
  }

  @Get()
  @Roles(Role.WORKER)
  @ApiOperation({
    summary: 'Publicaciones abiertas de mi ciudad, ordenadas por cercania',
  })
  @ApiOkResponse({ type: JobListPageDto })
  findOpen(
    @CurrentUser('userId') userId: string,
    @Query() query: QueryJobsDto,
  ) {
    return this.jobsService.findOpen(userId, query);
  }

  @Get('my')
  @Roles(Role.HOMEOWNER)
  @ApiOperation({ summary: 'Mis publicaciones (paginadas)' })
  @ApiOkResponse({ type: JobListPageDto })
  findMine(
    @CurrentUser('userId') userId: string,
    @Query() query: QueryMyJobsDto,
  ) {
    return this.jobsService.findMine(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una publicacion' })
  @ApiOkResponse({ type: JobDetailDto })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<JobDetailDto> {
    return this.jobsService.findOne(id, user.userId, user.role);
  }

  @Patch(':id')
  @Roles(Role.HOMEOWNER)
  @UseInterceptors(photoUpload)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Editar una publicacion abierta' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
        address: { type: 'string' },
        budget: { type: 'number' },
        photos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOkResponse({ type: JobDetailDto })
  update(
    @CurrentUser('userId') homeownerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
    @UploadedFiles() photos: Express.Multer.File[],
  ): Promise<JobDetailDto> {
    return this.jobsService.update(id, homeownerId, dto, photos ?? []);
  }

  @Post(':id/select/:workerId')
  @Roles(Role.HOMEOWNER)
  @ApiOperation({ summary: 'Seleccionar al trabajador (pasa a EN PROGRESO)' })
  @ApiOkResponse({ type: JobDetailDto })
  selectWorker(
    @CurrentUser('userId') homeownerId: string,
    @Param('id') id: string,
    @Param('workerId') workerId: string,
  ): Promise<JobDetailDto> {
    return this.jobsService.selectWorker(id, homeownerId, workerId);
  }

  @Post(':id/cancel')
  @Roles(Role.HOMEOWNER)
  @ApiOperation({ summary: 'Cancelar una publicacion' })
  @ApiOkResponse({ type: JobDetailDto })
  cancel(
    @CurrentUser('userId') homeownerId: string,
    @Param('id') id: string,
  ): Promise<JobDetailDto> {
    return this.jobsService.cancel(id, homeownerId);
  }

  @Delete(':id')
  @Roles(Role.HOMEOWNER)
  @ApiOperation({ summary: 'Eliminar una publicacion' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  remove(
    @CurrentUser('userId') homeownerId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.jobsService.remove(id, homeownerId);
  }
}
