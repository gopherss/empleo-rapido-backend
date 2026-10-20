import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApplicationStatus,
  Currency,
  JobStatus,
  WorkCategory,
} from '../../generated/prisma/enums.js';

export class JobContactDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl!: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'WhatsApp' })
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  distanceKm?: number | null;
}

export class JobListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: WorkCategory })
  category!: WorkCategory;

  @ApiProperty()
  city!: string;

  @ApiPropertyOptional({ nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  budget!: number | null;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty()
  latitude!: number;

  @ApiProperty()
  longitude!: number;

  @ApiProperty({ enum: JobStatus })
  status!: JobStatus;

  @ApiPropertyOptional({ nullable: true })
  photo!: string | null;

  @ApiProperty()
  photoCount!: number;

  @ApiPropertyOptional({ nullable: true, type: Number })
  distanceKm!: number | null;

  @ApiProperty()
  applicationCount!: number;

  @ApiProperty({
    description: 'Postulaciones pendientes de revisar (solo dueño)',
  })
  pendingApplicationCount!: number;

  @ApiProperty()
  applied!: boolean;

  @ApiProperty()
  createdAt!: Date;
}

export class JobDetailDto extends JobListItemDto {
  @ApiProperty({ type: [String] })
  photos!: string[];

  @ApiProperty({ type: JobContactDto })
  homeowner!: JobContactDto;

  @ApiPropertyOptional({ type: JobContactDto, nullable: true })
  worker?: JobContactDto | null;

  @ApiPropertyOptional({ nullable: true })
  selectedAt?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  completedAt?: Date | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  review?: unknown;

  @ApiPropertyOptional({
    enum: ApplicationStatus,
    nullable: true,
    description: 'Estado de mi postulacion (trabajador)',
  })
  myApplicationStatus?: ApplicationStatus | null;
}

export class JobPaginationMetaDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  pages!: number;
}

export class JobListPageDto {
  @ApiProperty({ type: [JobListItemDto] })
  data!: JobListItemDto[];

  @ApiProperty({ type: JobPaginationMetaDto })
  meta!: JobPaginationMetaDto;
}
