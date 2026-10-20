import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'juan@correo.com' })
  @IsEmail({}, { message: 'El correo no es valido' })
  email!: string;

  @ApiProperty({ example: 'secreto123' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
