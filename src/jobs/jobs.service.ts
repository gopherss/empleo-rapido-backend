import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import {
  ApplicationStatus,
  IdVerificationStatus,
  JobStatus,
  Role,
} from '../generated/prisma/enums.js';
import { haversineKm } from '../common/utils/geo.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import type { CreateJobDto } from './dto/create-job.dto.js';
import type {
  JobDetailDto,
  JobListItemDto,
} from './dto/job-response.dto.js';
import type { QueryJobsDto } from './dto/query-jobs.dto.js';
import type { QueryMyJobsDto } from './dto/query-my-jobs.dto.js';
import type { UpdateJobDto } from './dto/update-job.dto.js';

const MAX_JOB_PHOTOS = 3;

const listInclude = {
  photos: { orderBy: { order: 'asc' }, take: 1 },
  _count: { select: { applications: true } },
  applications: { select: { workerId: true, status: true } },
} satisfies Prisma.JobInclude;

const detailInclude = {
  photos: { orderBy: { order: 'asc' } },
  homeowner: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      phone: true,
    },
  },
  worker: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      phone: true,
    },
  },
  review: {
    include: {
      photos: { orderBy: { order: 'asc' } },
      author: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
    },
  },
  applications: { select: { workerId: true, status: true } },
} satisfies Prisma.JobInclude;

type JobListModel = Prisma.JobGetPayload<{ include: typeof listInclude }>;
type JobDetailModel = Prisma.JobGetPayload<{ include: typeof detailInclude }>;

interface MapContext {
  userId: string;
  latitude?: number | null;
  longitude?: number | null;
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(
    homeownerId: string,
    dto: CreateJobDto,
    files: Express.Multer.File[],
  ): Promise<JobDetailDto> {
    const homeowner = await this.prisma.user.findUnique({
      where: { id: homeownerId },
      select: { idVerificationStatus: true },
    });

    if (
      !homeowner ||
      homeowner.idVerificationStatus !== IdVerificationStatus.VERIFIED
    ) {
      throw new ForbiddenException(
        'Debes verificar tu identidad antes de publicar un trabajo',
      );
    }

    const urls = await this.storage.saveWebpImages(files, {
      folder: 'jobs',
      max: MAX_JOB_PHOTOS,
    });

    const job = await this.prisma.job.create({
      data: {
        homeownerId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        category: dto.category,
        city: dto.city.trim(),
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        budget: dto.budget,
        currency: dto.currency,
        photos: {
          create: urls.map((url, index) => ({ url, order: index })),
        },
      },
      include: detailInclude,
    });

    return this.toDetail(job, { userId: homeownerId });
  }

  async findOpen(userId: string, query: QueryJobsDto) {
    const worker = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { city: true, latitude: true, longitude: true },
    });

    const city = query.city ?? worker?.city ?? undefined;
    const latitude = query.latitude ?? worker?.latitude ?? undefined;
    const longitude = query.longitude ?? worker?.longitude ?? undefined;

    const where: Prisma.JobWhereInput = { status: JobStatus.OPEN };

    if (city) {
      where.city = { equals: city, mode: 'insensitive' };
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const jobs = await this.prisma.job.findMany({
      where,
      include: listInclude,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const context: MapContext = { userId, latitude, longitude };
    const items = jobs.map((job) => this.toListItem(job, context));

    const hasCoords = latitude !== undefined && longitude !== undefined;

    if (query.sort === 'distance' && hasCoords) {
      items.sort(
        (a, b) =>
          (a.distanceKm ?? Number.POSITIVE_INFINITY) -
          (b.distanceKm ?? Number.POSITIVE_INFINITY),
      );
    } else {
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    const total = items.length;
    const start = (query.page - 1) * query.limit;

    return {
      data: items.slice(start, start + query.limit),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        pages: Math.ceil(total / query.limit),
      },
    };
  }

  async findMine(homeownerId: string, query: QueryMyJobsDto) {
    const where: Prisma.JobWhereInput = { homeownerId };

    if (query.status) {
      where.status = query.status;
    }

    const skip = (query.page - 1) * query.limit;

    const [total, jobs] = await this.prisma.$transaction([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        include: listInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
    ]);

    return {
      data: jobs.map((job) => this.toListItem(job, { userId: homeownerId })),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        pages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(
    jobId: string,
    userId: string,
    role: Role,
  ): Promise<JobDetailDto> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: detailInclude,
    });

    if (!job) {
      throw new NotFoundException('Publicacion no encontrada');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { latitude: true, longitude: true },
    });

    void role;

    return this.toDetail(job, {
      userId,
      latitude: user?.latitude,
      longitude: user?.longitude,
    });
  }

  async update(
    jobId: string,
    homeownerId: string,
    dto: UpdateJobDto,
    files: Express.Multer.File[],
  ): Promise<JobDetailDto> {
    const job = await this.getOwnedOpenJob(jobId, homeownerId);

    if (files.length > 0) {
      const urls = await this.storage.saveWebpImages(files, {
        folder: 'jobs',
        max: MAX_JOB_PHOTOS,
      });

      const previous = await this.prisma.jobPhoto.findMany({
        where: { jobId: job.id },
      });

      await this.storage.deleteFiles(previous.map((photo) => photo.url));

      await this.prisma.jobPhoto.deleteMany({ where: { jobId: job.id } });

      await this.prisma.jobPhoto.createMany({
        data: urls.map((url, index) => ({
          jobId: job.id,
          url,
          order: index,
        })),
      });
    }

    await this.prisma.job.update({
      where: { id: job.id },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        category: dto.category,
        address: dto.address,
        budget: dto.budget,
      },
    });

    return this.findOne(jobId, homeownerId, Role.HOMEOWNER);
  }

  async cancel(jobId: string, homeownerId: string): Promise<JobDetailDto> {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException('Publicacion no encontrada');
    }

    if (job.homeownerId !== homeownerId) {
      throw new ForbiddenException('No eres el dueno de esta publicacion');
    }

    if (job.status === JobStatus.COMPLETED) {
      throw new BadRequestException('Un trabajo completado no se puede cancelar');
    }

    await this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.CANCELLED },
    });

    return this.findOne(jobId, homeownerId, Role.HOMEOWNER);
  }

  async remove(jobId: string, homeownerId: string): Promise<{ success: boolean }> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { photos: true, review: { include: { photos: true } } },
    });

    if (!job) {
      throw new NotFoundException('Publicacion no encontrada');
    }

    if (job.homeownerId !== homeownerId) {
      throw new ForbiddenException('No eres el dueno de esta publicacion');
    }

    if (job.status === JobStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'No puedes eliminar un trabajo en progreso',
      );
    }

    const urls = [
      ...job.photos.map((photo) => photo.url),
      ...(job.review?.photos.map((photo) => photo.url) ?? []),
    ];

    await this.prisma.job.delete({ where: { id: jobId } });
    await this.storage.deleteFiles(urls);

    return { success: true };
  }

  async selectWorker(
    jobId: string,
    homeownerId: string,
    workerId: string,
  ): Promise<JobDetailDto> {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException('Publicacion no encontrada');
    }

    if (job.homeownerId !== homeownerId) {
      throw new ForbiddenException('No eres el dueno de esta publicacion');
    }

    if (job.status !== JobStatus.OPEN) {
      throw new BadRequestException('La publicacion ya no esta disponible');
    }

    const worker = await this.prisma.user.findFirst({
      where: { id: workerId, role: Role.WORKER, isActive: true },
    });

    if (!worker) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    const application = await this.prisma.application.findUnique({
      where: { jobId_workerId: { jobId, workerId } },
    });

    if (!application) {
      throw new BadRequestException(
        'El trabajador no se ha postulado a esta publicacion',
      );
    }

    await this.prisma.$transaction([
      this.prisma.job.update({
        where: { id: jobId },
        data: {
          workerId,
          status: JobStatus.IN_PROGRESS,
          selectedAt: new Date(),
        },
      }),
      this.prisma.application.updateMany({
        where: { jobId, workerId },
        data: { status: ApplicationStatus.ACCEPTED },
      }),
      this.prisma.application.updateMany({
        where: { jobId, workerId: { not: workerId } },
        data: { status: ApplicationStatus.REJECTED },
      }),
    ]);

    return this.findOne(jobId, homeownerId, Role.HOMEOWNER);
  }

  private async getOwnedOpenJob(jobId: string, homeownerId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException('Publicacion no encontrada');
    }

    if (job.homeownerId !== homeownerId) {
      throw new ForbiddenException('No eres el dueno de esta publicacion');
    }

    if (job.status !== JobStatus.OPEN) {
      throw new BadRequestException(
        'Solo se pueden editar publicaciones abiertas',
      );
    }

    return job;
  }

  private distance(
    context: MapContext,
    latitude: number,
    longitude: number,
  ): number | null {
    if (context.latitude === undefined || context.longitude === undefined) {
      return null;
    }

    if (context.latitude === null || context.longitude === null) {
      return null;
    }

    return haversineKm(
      context.latitude,
      context.longitude,
      latitude,
      longitude,
    );
  }

  private toListItem(job: JobListModel, context: MapContext): JobListItemDto {
    return {
      id: job.id,
      title: job.title,
      description: job.description,
      category: job.category,
      city: job.city,
      address: job.address,
      budget: job.budget !== null ? Number(job.budget) : null,
      currency: job.currency,
      latitude: job.latitude,
      longitude: job.longitude,
      status: job.status,
      photo: job.photos[0]?.url ?? null,
      photoCount: job.photos.length,
      distanceKm: this.distance(context, job.latitude, job.longitude),
      applicationCount: job._count.applications,
      pendingApplicationCount: job.applications.filter(
        (a) => a.status === ApplicationStatus.PENDING,
      ).length,
      applied: job.applications.some((a) => a.workerId === context.userId),
      createdAt: job.createdAt,
    };
  }

  private toDetail(job: JobDetailModel, context: MapContext): JobDetailDto {
    const myApplication = job.applications.find(
      (a) => a.workerId === context.userId,
    );

    const canSeeHomeownerContact =
      job.homeowner.id === context.userId ||
      job.worker?.id === context.userId;

    return {
      id: job.id,
      title: job.title,
      description: job.description,
      category: job.category,
      city: job.city,
      address: job.address,
      budget: job.budget !== null ? Number(job.budget) : null,
      currency: job.currency,
      latitude: job.latitude,
      longitude: job.longitude,
      status: job.status,
      photo: job.photos[0]?.url ?? null,
      photoCount: job.photos.length,
      distanceKm: this.distance(context, job.latitude, job.longitude),
      applicationCount: job.applications.length,
      pendingApplicationCount: job.applications.filter(
        (a) => a.status === ApplicationStatus.PENDING,
      ).length,
      applied: Boolean(myApplication),
      createdAt: job.createdAt,
      photos: job.photos.map((photo) => photo.url),
      homeowner: {
        id: job.homeowner.id,
        firstName: job.homeowner.firstName,
        lastName: job.homeowner.lastName,
        avatarUrl: job.homeowner.avatarUrl,
        phone: canSeeHomeownerContact ? job.homeowner.phone : null,
      },
      worker: job.worker
        ? {
            id: job.worker.id,
            firstName: job.worker.firstName,
            lastName: job.worker.lastName,
            avatarUrl: job.worker.avatarUrl,
            phone: job.worker.phone,
          }
        : null,
      selectedAt: job.selectedAt,
      completedAt: job.completedAt,
      review: job.review
        ? {
            id: job.review.id,
            rating: job.review.rating,
            comment: job.review.comment,
            createdAt: job.review.createdAt,
            author: job.review.author,
            photos: job.review.photos.map((photo) => photo.url),
          }
        : null,
      myApplicationStatus: myApplication?.status ?? null,
    };
  }
}
