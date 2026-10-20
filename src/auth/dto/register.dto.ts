import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../generated/prisma/enums.js';

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
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Perez' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ enum: Role, example: Role.WORKER })
  @IsEnum(Role, { message: 'El rol debe ser WORKER o HOMEOWNER' })
  role!: Role;

  @ApiProperty({ example: '+59170000000', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ example: 'Santa Cruz', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiProperty({ example: -17.7833, required: false })
  @IsOptional()
  @IsNumber()
  @IsLatitude({ message: 'La latitud no es valida' })
  latitude?: number;

  @ApiProperty({ example: -63.1821, required: false })
  @IsOptional()
  @IsNumber()
  @IsLongitude({ message: 'La longitud no es valida' })
  longitude?: number;
}
