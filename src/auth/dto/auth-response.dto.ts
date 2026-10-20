import { ApiProperty } from '@nestjs/swagger';
import { PublicUserDto } from '../../common/dto/public-user.dto.js';

export class AuthResponseDto {
  @ApiProperty({ type: PublicUserDto })
  user!: PublicUserDto;

  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ description: 'Vigencia del access token en segundos' })
  accessTokenExpiresIn!: number;

  @ApiProperty({ description: 'Vigencia del refresh token en segundos' })
  refreshTokenExpiresIn!: number;
}
