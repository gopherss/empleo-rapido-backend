import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const PHONE_REGEX = /^\+?[0-9\s()-]{6,20}$/;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Ingresa tu nombre' })
  @MaxLength(60)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Ingresa tu apellido' })
  @MaxLength(60)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Ingresa tu WhatsApp' })
  @Matches(PHONE_REGEX, { message: 'Ingresa un telefono valido' })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Ingresa tu ciudad' })
  @MaxLength(120)
  city?: string;
}

export class UpdateLocationDto {
  @ApiPropertyOptional({ example: 'Santa Cruz' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ example: -17.7833 })
  @IsLatitude({ message: 'La latitud no es valida' })
  latitude!: number;

  @ApiPropertyOptional({ example: -63.1821 })
  @IsLongitude({ message: 'La longitud no es valida' })
  longitude!: number;
}
