import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApplicationStatus } from '../../generated/prisma/enums.js';
import { PaginationDto } from '../../jobs/dto/pagination.dto.js';

export class QueryMyApplicationsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ApplicationStatus })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({ description: 'Busqueda por titulo del trabajo' })
  @IsOptional()
  @IsString()
  q?: string;
}
