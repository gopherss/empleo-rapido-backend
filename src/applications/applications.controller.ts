import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { ApplicationsService } from './applications.service.js';
import {
  ApplicantDto,
  CreateApplicationDto,
  MyApplicationPageDto,
} from './dto/application.dto.js';
import { QueryMyApplicationsDto } from './dto/query-my-applications.dto.js';

@ApiTags('Applications')
@ApiBearerAuth()
@Controller()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post('jobs/:jobId/applications')
  @Roles(Role.WORKER)
  @ApiOperation({ summary: 'Postularme a una publicacion (1 clic)' })
  @ApiCreatedResponse({ type: ApplicantDto })
  apply(
    @CurrentUser('userId') workerId: string,
    @Param('jobId') jobId: string,
    @Body() dto: CreateApplicationDto,
  ): Promise<ApplicantDto> {
    return this.applicationsService.apply(jobId, workerId, dto.message);
  }

  @Get('jobs/:jobId/applications')
  @Roles(Role.HOMEOWNER)
  @ApiOperation({ summary: 'Ver postulantes de mi publicacion (por cercania)' })
  @ApiOkResponse({ type: [ApplicantDto] })
  list(
    @CurrentUser('userId') homeownerId: string,
    @Param('jobId') jobId: string,
  ): Promise<ApplicantDto[]> {
    return this.applicationsService.listForJob(jobId, homeownerId);
  }

  @Get('applications/pending-count')
  @Roles(Role.HOMEOWNER)
  @ApiOperation({
    summary: 'Total de postulaciones pendientes en mis publicaciones',
  })
  @ApiOkResponse({ schema: { example: { count: 3 } } })
  async pendingCount(
    @CurrentUser('userId') homeownerId: string,
  ): Promise<{ count: number }> {
    const count =
      await this.applicationsService.countPendingForHomeowner(homeownerId);
    return { count };
  }

  @Get('applications/my')
  @Roles(Role.WORKER)
  @ApiOperation({ summary: 'Mis postulaciones (paginadas y filtrables)' })
  @ApiOkResponse({ type: MyApplicationPageDto })
  mine(
    @CurrentUser('userId') workerId: string,
    @Query() query: QueryMyApplicationsDto,
  ): Promise<MyApplicationPageDto> {
    return this.applicationsService.listMine(workerId, query);
  }

  @Delete('applications/:id')
  @Roles(Role.WORKER)
  @ApiOperation({ summary: 'Retirar una postulacion pendiente' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  withdraw(
    @CurrentUser('userId') workerId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.applicationsService.withdraw(id, workerId);
  }
}
