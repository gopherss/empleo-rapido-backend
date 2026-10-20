import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobStatus, Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import type { CreateReviewDto, ReviewDto } from './dto/review.dto.js';

const MAX_REVIEW_PHOTOS = 3;
const MIN_REVIEW_PHOTOS = 1;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(
    jobId: string,
    homeownerId: string,
    dto: CreateReviewDto,
    files: Express.Multer.File[],
  ): Promise<ReviewDto> {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException('Publicacion no encontrada');
    }

    if (job.homeownerId !== homeownerId) {
      throw new ForbiddenException('No eres el dueno de esta publicacion');
    }

    const existing = await this.prisma.review.findUnique({ where: { jobId } });

    if (existing) {
      throw new ConflictException('Este trabajo ya fue calificado');
    }

    if (job.status !== JobStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Solo se puede calificar un trabajo en progreso',
      );
    }

    if (!job.workerId) {
      throw new BadRequestException('La publicacion no tiene trabajador asignado');
    }

    const urls = await this.storage.saveWebpImages(files, {
      folder: 'reviews',
      min: MIN_REVIEW_PHOTOS,
      max: MAX_REVIEW_PHOTOS,
    });

    const workerId = job.workerId;

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          jobId,
          authorId: homeownerId,
          targetId: workerId,
          rating: dto.rating,
          comment: dto.comment,
          photos: {
            create: urls.map((url, index) => ({ url, order: index })),
          },
        },
        include: {
          photos: { orderBy: { order: 'asc' } },
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          job: {
            select: { id: true, title: true, category: true, city: true },
          },
        },
      });

      // Al terminar, la tarjeta sale de disponibles.
      await tx.job.update({
        where: { id: jobId },
        data: { status: JobStatus.COMPLETED, completedAt: new Date() },
      });

      // El trabajo completado se agrega al CV del trabajador.
      const aggregate = await tx.review.aggregate({
        where: { targetId: workerId },
        _avg: { rating: true },
        _count: { _all: true },
      });

      await tx.workerProfile.upsert({
        where: { userId: workerId },
        create: {
          userId: workerId,
          averageRating: aggregate._avg.rating ?? 0,
          completedJobs: aggregate._count._all,
        },
        update: {
          averageRating: aggregate._avg.rating ?? 0,
          completedJobs: aggregate._count._all,
        },
      });

      return created;
    });

    return this.toReview(review);
  }

  async listByWorker(workerId: string): Promise<ReviewDto[]> {
    const worker = await this.prisma.user.findFirst({
      where: { id: workerId, role: Role.WORKER },
      select: { id: true },
    });

    if (!worker) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    const reviews = await this.prisma.review.findMany({
      where: { targetId: workerId },
      include: {
        photos: { orderBy: { order: 'asc' } },
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        job: {
          select: { id: true, title: true, category: true, city: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((review) => this.toReview(review));
  }

  private toReview(review: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    targetId: string;
    jobId: string;
    photos: { url: string }[];
    author?: unknown;
    job?: unknown;
  }): ReviewDto {
    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      photos: review.photos.map((photo) => photo.url),
      workerId: review.targetId,
      jobId: review.jobId,
      author: review.author,
      job: review.job,
    };
  }
}
