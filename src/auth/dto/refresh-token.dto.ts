import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token emitido al iniciar sesion' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
