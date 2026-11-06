import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, JobStatus, Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { StorageService } from '../storage/storage.service.js';
import type { AdminStatsDto } from './dto/admin-stats.dto.js';
import type {
  AdminJobDto,
  AdminJobPageDto,
} from './dto/admin-job.dto.js';
import type { AdminUserPageDto } from './dto/admin-user.dto.js';
import type { FindAdminJobsQueryDto } from './dto/find-admin-jobs-query.dto.js';
import type { FindAdminUsersQueryDto } from './dto/find-admin-users-query.dto.js';

const takeFrom = (limit: number) => Math.min(Math.max(limit, 1), 50);

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
    private readonly storage: StorageService,
  ) {}

  async getStats(): Promise<AdminStatsDto> {
    const [
      usersTotal,
      workersTotal,
      homeownersTotal,
      jobsOpen,
      jobsCompleted,
      jobsCancelled,
      applicationsPending,
      notificationsTotal,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: Role.WORKER } }),
      this.prisma.user.count({ where: { role: Role.HOMEOWNER } }),
      this.prisma.job.count({ where: { status: JobStatus.OPEN } }),
      this.prisma.job.count({ where: { status: JobStatus.COMPLETED } }),
      this.prisma.job.count({ where: { status: JobStatus.CANCELLED } }),
      this.prisma.application.count({
        where: { status: ApplicationStatus.PENDING },
      }),
      this.prisma.notification.count(),
    ]);

    return {
      usersTotal,
      workersTotal,
      homeownersTotal,
      jobsOpen,
      jobsCompleted,
      jobsCancelled,
      applicationsPending,
      notificationsTotal,
    };
  }

  async findUsers(query: FindAdminUsersQueryDto): Promise<AdminUserPageDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const take = takeFrom(limit);
    const where = {
      ...(query.query
        ? {
            OR: [
              { email: { contains: query.query, mode: 'insensitive' as const } },
              { firstName: { contains: query.query, mode: 'insensitive' as const } },
              { lastName: { contains: query.query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(query.role ? { role: query.role } : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          city: true,
          phone: true,
          isActive: true,
          idVerificationStatus: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const userIds = users.map((user) => user.id);

    const [jobCounts, applicationCounts] = userIds.length > 0
      ? await Promise.all([
          this.prisma.job.groupBy({
            by: ['homeownerId'],
            where: { homeownerId: { in: userIds } },
            _count: { _all: true },
          }),
          this.prisma.application.groupBy({
            by: ['workerId'],
            where: { workerId: { in: userIds } },
            _count: { _all: true },
          }),
        ])
      : [[], []];
    const jobsById = new Map<string, number>(
      jobCounts.map((group) => [group.homeownerId, group._count._all]),
    );
    const applicationsById = new Map<string, number>(
      applicationCounts.map((group) => [group.workerId, group._count._all]),
    );

    return {
      data: users.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        city: user.city,
        phone: user.phone,
        isActive: user.isActive,
        idVerificationStatus: user.idVerificationStatus,
        jobsCount: jobsById.get(user.id) ?? 0,
        applicationsCount: applicationsById.get(user.id) ?? 0,
        createdAt: user.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findJobs(query: FindAdminJobsQueryDto): Promise<AdminJobPageDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const take = takeFrom(limit);
    const where = {
      ...(query.query
        ? {
            title: { contains: query.query, mode: 'insensitive' as const },
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.city ? { city: { contains: query.city, mode: 'insensitive' as const } } : {}),
    };

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          title: true,
          category: true,
          city: true,
          status: true,
          budget: true,
          currency: true,
          createdAt: true,
          homeowner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          worker: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: { select: { applications: true } },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    const items: AdminJobDto[] = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      category: job.category,
      city: job.city,
      status: job.status,
      budget: job.budget !== null ? Number(job.budget) : null,
      currency: job.currency,
      createdAt: job.createdAt,
      homeowner: job.homeowner,
      worker: job.worker,
      applicationsCount: job._count.applications,
    }));

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async cancelJob(jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException('Publicacion no encontrada');
    }

    if (job.status === JobStatus.CANCELLED) {
      throw new BadRequestException(
        'Una publicacion cancelada no se puede cancelar de nuevo',
      );
    }

    await this.jobsService.cancel(jobId, job.homeownerId);

    return { success: true };
  }

  async setUserStatus(
    targetId: string,
    adminId: string,
    isActive: boolean,
  ) {
    if (targetId === adminId) {
      throw new BadRequestException(
        'No puedes cambiar el estado de tu propia cuenta',
      );
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, role: true, isActive: true },
    });

    if (!target) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (target.role === Role.ADMIN) {
      throw new ForbiddenException(
        'No puedes modificar la cuenta de otro administrador',
      );
    }

    const user = await this.prisma.user.update({
      where: { id: targetId },
      data: { isActive },
      select: { id: true, isActive: true },
    });

    if (!isActive) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: targetId },
      });
    }

    return { id: user.id, isActive: user.isActive };
  }

  async deleteUser(targetId: string, adminId: string) {
    if (targetId === adminId) {
      throw new BadRequestException(
        'No puedes eliminar tu propia cuenta desde el panel',
      );
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        role: true,
        avatarUrl: true,
        dniFrontPath: true,
        dniBackPath: true,
        selfiePath: true,
        jobsPosted: { select: { photos: { select: { url: true } } } },
        reviewsWritten: { select: { photos: { select: { url: true } } } },
      },
    });

    if (!target) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (target.role === Role.ADMIN) {
      throw new ForbiddenException(
        'No puedes eliminar la cuenta de otro administrador',
      );
    }

    const urls: string[] = [];

    if (target.avatarUrl) {
      urls.push(target.avatarUrl);
    }

    for (const job of target.jobsPosted) {
      for (const photo of job.photos) {
        urls.push(photo.url);
      }
    }

    for (const review of target.reviewsWritten) {
      for (const photo of review.photos) {
        urls.push(photo.url);
      }
    }

    const privatePaths: string[] = [];
    for (const path of [
      target.dniFrontPath,
      target.dniBackPath,
      target.selfiePath,
    ]) {
      if (path) {
        privatePaths.push(path);
      }
    }

    await this.storage.deleteFiles(urls);
    await this.storage.deletePrivateFiles(privatePaths);

    await this.prisma.user.delete({ where: { id: targetId } });

    return { success: true };
  }
}
