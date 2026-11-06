import { ApiProperty } from '@nestjs/swagger';
import { IdVerificationStatus, Role } from '../../generated/prisma/enums.js';
import { AdminListMetaDto } from './admin-job.dto.js';

export class AdminUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty({ nullable: true })
  city!: string | null;

  @ApiProperty()
  phone!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ enum: IdVerificationStatus })
  idVerificationStatus!: IdVerificationStatus;

  @ApiProperty()
  jobsCount!: number;

  @ApiProperty()
  applicationsCount!: number;

  @ApiProperty()
  createdAt!: Date;
}

export class AdminUserPageDto {
  @ApiProperty({ type: [AdminUserDto] })
  data!: AdminUserDto[];

  @ApiProperty({ type: AdminListMetaDto })
  meta!: AdminListMetaDto;
}
