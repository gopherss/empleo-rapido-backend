import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateAdminUserStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}
