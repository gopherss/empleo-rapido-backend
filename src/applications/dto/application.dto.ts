import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  ApplicationStatus,
  WorkCategory,
} from '../../generated/prisma/enums.js';

export class CreateApplicationDto {
  @ApiPropertyOptional({
    example: 'Puedo ir hoy mismo, tengo experiencia en fugas.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class ApplicantDto {
  @ApiProperty()
  applicationId!: string;

  @ApiProperty({ enum: ApplicationStatus })
  status!: ApplicationStatus;

  @ApiPropertyOptional({ nullable: true })
  message!: string | null;

  @ApiProperty()
  appliedAt!: Date;

  @ApiProperty()
  workerId!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl!: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'WhatsApp' })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  city!: string | null;

  @ApiPropertyOptional({ nullable: true })
  headline!: string | null;

  @ApiPropertyOptional({ nullable: true })
  bio!: string | null;

  @ApiProperty({ enum: WorkCategory, isArray: true })
  categories!: WorkCategory[];

  @ApiProperty({ type: [String] })
  skills!: string[];

  @ApiPropertyOptional({ nullable: true })
  experienceYears!: number | null;

  @ApiProperty()
  averageRating!: number;

  @ApiProperty()
  completedJobs!: number;

  @ApiPropertyOptional({ nullable: true, type: Number })
  distanceKm!: number | null;
}

export class MyApplicationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ApplicationStatus })
  status!: ApplicationStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  jobId!: string;

  @ApiProperty()
  jobTitle!: string;

  @ApiProperty({ enum: WorkCategory })
  category!: WorkCategory;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  jobStatus!: string;
}

export class MyApplicationPaginationMetaDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  pages!: number;
}

export class MyApplicationPageDto {
  @ApiProperty({ type: [MyApplicationDto] })
  data!: MyApplicationDto[];

  @ApiProperty({ type: MyApplicationPaginationMetaDto })
  meta!: MyApplicationPaginationMetaDto;
}
