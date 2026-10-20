import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { validateEnv } from './config/env.validation.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StorageModule } from './storage/storage.module.js';
import { UsersModule } from './users/users.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { ApplicationsModule } from './applications/applications.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { IdentityModule } from './identity/identity.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateEnv,
    }),
    PrismaModule,
    StorageModule,
    AuthModule,
    UsersModule,
    JobsModule,
    ApplicationsModule,
    ReviewsModule,
    IdentityModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Autenticacion global: todas las rutas requieren JWT salvo @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Autorizacion por roles (@Roles(...)).
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
