import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkCategory, Currency } from '../../generated/prisma/enums.js';

export class WorkerCvDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  city!: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'WhatsApp' })
  phone!: string | null;

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

  @ApiPropertyOptional({ nullable: true, type: Number })
  hourlyRate!: number | null;

  @ApiProperty({ enum: Currency, example: Currency.PEN })
  currency!: Currency;

  @ApiProperty()
  isAvailable!: boolean;

  @ApiProperty()
  averageRating!: number;

  @ApiProperty()
  completedJobs!: number;

  @ApiPropertyOptional({ type: [Object] })
  reviews?: unknown[];
}
