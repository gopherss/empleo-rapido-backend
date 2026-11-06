import { ApiProperty } from '@nestjs/swagger';
import { PublicUserDto } from '../../common/dto/public-user.dto.js';

// El refresh token viaja solo en la cookie HttpOnly: no se expone en el JSON.
export class AuthResponseDto {
  @ApiProperty({ type: PublicUserDto })
  user!: PublicUserDto;

  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ description: 'Vigencia del access token en segundos' })
  accessTokenExpiresIn!: number;
}
