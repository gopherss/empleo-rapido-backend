import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { JobStatus } from '../../generated/prisma/enums.js';
import { PaginationDto } from './pagination.dto.js';

export class QueryMyJobsDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: JobStatus,
    description: 'Filtrar mis publicaciones por estado',
  })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}
