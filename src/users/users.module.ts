import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { WorkersController } from './workers.controller.js';

@Module({
  controllers: [UsersController, WorkersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
