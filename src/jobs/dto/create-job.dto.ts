import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { WorkCategory, Currency } from '../../generated/prisma/enums.js';

export class CreateJobDto {
  @ApiProperty({ example: 'Arreglar fuga en el bano' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @ApiProperty({
    example: 'Hay una fuga debajo del lavamanos que moja el piso.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  description!: string;

  @ApiProperty({ enum: WorkCategory })
  @IsEnum(WorkCategory)
  category!: WorkCategory;

  @ApiProperty({ example: 'Santa Cruz' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  city!: string;

  @ApiPropertyOptional({ example: 'Av. Monseñor Rivero #123' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiProperty({ example: -17.7833 })
  @Type(() => Number)
  @IsLatitude({ message: 'La latitud no es valida' })
  latitude!: number;

  @ApiProperty({ example: -63.1821 })
  @Type(() => Number)
  @IsLongitude({ message: 'La longitud no es valida' })
  longitude!: number;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({ enum: Currency, example: Currency.PEN })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}
