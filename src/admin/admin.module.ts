import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [JobsModule, StorageModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
