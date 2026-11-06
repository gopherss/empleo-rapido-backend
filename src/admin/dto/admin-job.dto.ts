import { ApiProperty } from '@nestjs/swagger';
import { Currency, JobStatus, WorkCategory } from '../../generated/prisma/enums.js';

export class AdminJobPersonDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;
}

export class AdminListMetaDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  pages!: number;
}

export class AdminJobDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: WorkCategory })
  category!: WorkCategory;

  @ApiProperty()
  city!: string;

  @ApiProperty({ enum: JobStatus })
  status!: JobStatus;

  @ApiProperty({ nullable: true, type: Number })
  budget!: number | null;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: AdminJobPersonDto })
  homeowner!: AdminJobPersonDto;

  @ApiProperty({ type: AdminJobPersonDto, nullable: true })
  worker!: AdminJobPersonDto | null;

  @ApiProperty()
  applicationsCount!: number;
}

export class AdminJobPageDto {
  @ApiProperty({ type: [AdminJobDto] })
  data!: AdminJobDto[];

  @ApiProperty({ type: AdminListMetaDto })
  meta!: AdminListMetaDto;
}
