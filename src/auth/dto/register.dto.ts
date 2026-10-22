import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../generated/prisma/enums.js';

const PHONE_REGEX = /^\+?[0-9\s()-]{6,20}$/;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class RegisterDto {
  @ApiProperty({ example: 'juan@correo.com' })
  @IsEmail({}, { message: 'El correo no es valido' })
  email!: string;

  @ApiProperty({ minLength: 8, example: 'secreto123' })
  @IsString()
  @MinLength(8, { message: 'La contrasena debe tener al menos 8 caracteres' })
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: 'Juan' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Ingresa tu nombre' })
  firstName!: string;

  @ApiProperty({ example: 'Perez' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Ingresa tu apellido' })
  lastName!: string;

  @ApiProperty({ enum: Role, example: Role.WORKER })
  @IsEnum(Role, { message: 'El rol debe ser WORKER o HOMEOWNER' })
  role!: Role;

  @ApiProperty({ example: '+59170000000' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Ingresa tu WhatsApp' })
  @Matches(PHONE_REGEX, { message: 'Ingresa un telefono valido' })
  phone!: string;

  @ApiProperty({ example: 'Santa Cruz' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Ingresa tu ciudad' })
  @MaxLength(120)
  city!: string;

  @ApiProperty({ example: -17.7833 })
  @IsNumber()
  @IsLatitude({ message: 'La latitud no es valida' })
  latitude!: number;

  @ApiProperty({ example: -63.1821 })
  @IsNumber()
  @IsLongitude({ message: 'La longitud no es valida' })
  longitude!: number;
}
