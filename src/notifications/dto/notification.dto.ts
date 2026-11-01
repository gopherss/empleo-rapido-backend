import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../../generated/prisma/enums.js';

export class NotificationDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false, nullable: true })
  link: string | null;

  @ApiProperty()
  read: boolean;

  @ApiProperty()
  createdAt: Date;
}
