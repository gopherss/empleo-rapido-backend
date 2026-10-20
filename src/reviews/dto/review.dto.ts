import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'La puntuacion minima es 1' })
  @Max(5, { message: 'La puntuacion maxima es 5' })
  rating!: number;

  @ApiPropertyOptional({ example: 'Trabajo impecable y puntual.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class ReviewDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  rating!: number;

  @ApiPropertyOptional({ nullable: true })
  comment!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: [String] })
  photos!: string[];

  @ApiProperty()
  workerId!: string;

  @ApiProperty()
  jobId!: string;

  @ApiPropertyOptional({ type: Object, nullable: true })
  author?: unknown;

  @ApiPropertyOptional({ type: Object, nullable: true })
  job?: unknown;
}
