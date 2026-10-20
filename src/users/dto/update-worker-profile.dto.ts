import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { WorkCategory, Currency } from '../../generated/prisma/enums.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateWorkerProfileDto {
  @ApiPropertyOptional({ example: 'Plomero con 10 anos de experiencia' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  headline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ enum: WorkCategory, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsEnum(WorkCategory, { each: true })
  categories?: WorkCategory[];

  @ApiPropertyOptional({ type: [String], example: ['Instalaciones', 'Fugas'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(40, { each: true, message: 'Cada habilidad admite maximo 40 caracteres' })
  skills?: string[];

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(70)
  experienceYears?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  hourlyRate?: number;

  @ApiPropertyOptional({ enum: Currency, example: Currency.PEN })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
