import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import {
  ApplicationStatus,
  IdVerificationStatus,
  JobStatus,
} from '../generated/prisma/enums.js';
import { haversineKm } from '../common/utils/geo.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  ApplicantDto,
  MyApplicationPageDto,
} from './dto/application.dto.js';
import type { QueryMyApplicationsDto } from './dto/query-my-applications.dto.js';

const applicantInclude = {
  worker: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      phone: true,
      city: true,
      latitude: true,
      longitude: true,
      workerProfile: true,
    },
  },
} satisfies Prisma.ApplicationInclude;

type ApplicationWithWorker = Prisma.ApplicationGetPayload<{
  include: typeof applicantInclude;
}>;

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(
    jobId: string,
    workerId: string,
    message?: string,
  ): Promise<ApplicantDto> {
    const worker = await this.prisma.user.findUnique({
      where: { id: workerId },
      select: { idVerificationStatus: true },
    });

    if (
      !worker ||
      worker.idVerificationStatus !== IdVerificationStatus.VERIFIED
    ) {
      throw new ForbiddenException(
        'Debes verificar tu identidad antes de postularte a un trabajo',
      );
    }

    const job = await this.prisma.job.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException('Publicacion no encontrada');
    }

    if (job.status !== JobStatus.OPEN) {
      throw new BadRequestException('La publicacion ya no esta disponible');
    }

    const existing = await this.prisma.application.findUnique({
      where: { jobId_workerId: { jobId, workerId } },
    });

    if (existing) {
      throw new ConflictException('Ya te postulaste a esta publicacion');
    }

    const application = await this.prisma.application.create({
      data: { jobId, workerId, message },
      include: applicantInclude,
    });

    return this.toApplicant(application, job.latitude, job.longitude);
  }

  async listForJob(
    jobId: string,
    homeownerId: string,
  ): Promise<ApplicantDto[]> {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException('Publicacion no encontrada');
    }

    if (job.homeownerId !== homeownerId) {
      throw new ForbiddenException('No eres el dueno de esta publicacion');
    }

    const applications = await this.prisma.application.findMany({
      where: { jobId, status: { not: ApplicationStatus.WITHDRAWN } },
      include: applicantInclude,
      orderBy: { createdAt: 'asc' },
    });

    return applications
      .map((application) =>
        this.toApplicant(application, job.latitude, job.longitude),
      )
      .sort(
        (a, b) =>
          (a.distanceKm ?? Number.POSITIVE_INFINITY) -
          (b.distanceKm ?? Number.POSITIVE_INFINITY),
      );
  }

  async countPendingForHomeowner(homeownerId: string): Promise<number> {
    return this.prisma.application.count({
      where: { status: ApplicationStatus.PENDING, job: { homeownerId } },
    });
  }

  async listMine(
    workerId: string,
    query: QueryMyApplicationsDto,
  ): Promise<MyApplicationPageDto> {
    const where: Prisma.ApplicationWhereInput = { workerId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.q) {
      where.job = {
        is: { title: { contains: query.q, mode: 'insensitive' } },
      };
    }

    const skip = (query.page - 1) * query.limit;

    const [total, applications] = await this.prisma.$transaction([
      this.prisma.application.count({ where }),
      this.prisma.application.findMany({
        where,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              category: true,
              city: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
    ]);

    return {
      data: applications.map((application) => ({
        id: application.id,
        status: application.status,
        createdAt: application.createdAt,
        jobId: application.job.id,
        jobTitle: application.job.title,
        category: application.job.category,
        city: application.job.city,
        jobStatus: application.job.status,
      })),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        pages: Math.ceil(total / query.limit),
      },
    };
  }


  async withdraw(
    applicationId: string,
    workerId: string,
  ): Promise<{ success: boolean }> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Postulacion no encontrada');
    }

    if (application.workerId !== workerId) {
      throw new ForbiddenException('No eres el autor de esta postulacion');
    }

    if (application.status === ApplicationStatus.ACCEPTED) {
      throw new BadRequestException(
        'No puedes retirar una postulacion aceptada',
      );
    }

    await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.WITHDRAWN },
    });

    return { success: true };
  }

  async reject(
    applicationId: string,
    homeownerId: string,
  ): Promise<{ success: boolean }> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });

    if (!application) {
      throw new NotFoundException('Postulacion no encontrada');
    }

    if (application.job.homeownerId !== homeownerId) {
      throw new ForbiddenException('No eres el dueno de esta publicacion');
    }

    if (application.status === ApplicationStatus.ACCEPTED) {
      throw new BadRequestException(
        'No puedes rechazar una postulacion ya aceptada',
      );
    }

    if (application.status === ApplicationStatus.WITHDRAWN) {
      throw new BadRequestException('Esta postulacion ya fue retirada');
    }

    await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.REJECTED },
    });

    return { success: true };
  }

  private toApplicant(
    application: ApplicationWithWorker,
    jobLatitude: number,
    jobLongitude: number,
  ): ApplicantDto {
    const { worker } = application;
    const profile = worker.workerProfile;

    const distanceKm =
      worker.latitude !== null && worker.longitude !== null
        ? haversineKm(
            jobLatitude,
            jobLongitude,
            worker.latitude,
            worker.longitude,
          )
        : null;

    return {
      applicationId: application.id,
      status: application.status,
      message: application.message,
      appliedAt: application.createdAt,
      workerId: worker.id,
      firstName: worker.firstName,
      lastName: worker.lastName,
      avatarUrl: worker.avatarUrl,
      phone: worker.phone,
      city: worker.city,
      headline: profile?.headline ?? null,
      bio: profile?.bio ?? null,
      categories: profile?.categories ?? [],
      skills: profile?.skills ?? [],
      experienceYears: profile?.experienceYears ?? null,
      averageRating: profile?.averageRating ?? 0,
      completedJobs: profile?.completedJobs ?? 0,
      distanceKm,
    };
  }
}
