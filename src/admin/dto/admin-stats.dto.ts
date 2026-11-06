import { ApiProperty } from '@nestjs/swagger';

export class AdminStatsDto {
  @ApiProperty()
  usersTotal!: number;

  @ApiProperty()
  workersTotal!: number;

  @ApiProperty()
  homeownersTotal!: number;

  @ApiProperty()
  jobsOpen!: number;

  @ApiProperty()
  jobsCompleted!: number;

  @ApiProperty()
  jobsCancelled!: number;

  @ApiProperty()
  applicationsPending!: number;

  @ApiProperty()
  notificationsTotal!: number;
}
