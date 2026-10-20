import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { WorkCategory } from '../../generated/prisma/enums.js';
import { PaginationDto } from './pagination.dto.js';

export class QueryJobsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Ciudad; por defecto la del trabajador' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: WorkCategory })
  @IsOptional()
  @IsEnum(WorkCategory)
  category?: WorkCategory;

  @ApiPropertyOptional({ description: 'Busqueda por texto en titulo/descripcion' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Latitud actual del trabajador' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitud actual del trabajador' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ enum: ['distance', 'recent'], default: 'distance' })
  @IsOptional()
  @IsIn(['distance', 'recent'])
  sort: 'distance' | 'recent' = 'distance';
}
