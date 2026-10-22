import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IdVerificationStatus,
  Role,
} from '../../generated/prisma/enums.js';
import type {
  UserModel,
  WorkerProfileModel,
} from '../../generated/prisma/models.js';

export class PublicUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  city!: string | null;

  @ApiPropertyOptional({ nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  latitude!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  longitude!: number | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ enum: IdVerificationStatus })
  idVerificationStatus!: IdVerificationStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional({ type: Object, nullable: true })
  workerProfile?: WorkerProfileModel | null;

  static fromUser(
    user: UserModel & { workerProfile?: WorkerProfileModel | null },
  ): PublicUserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      avatarUrl: user.avatarUrl,
      city: user.city,
      address: user.address ?? null,
      latitude: user.latitude,
      longitude: user.longitude,
      isActive: user.isActive,
      idVerificationStatus: user.idVerificationStatus,
      createdAt: user.createdAt,
      workerProfile: user.workerProfile ?? null,
    };
  }
}
