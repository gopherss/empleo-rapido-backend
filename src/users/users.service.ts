import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, Currency } from '../generated/prisma/enums.js';
import { Prisma } from '../generated/prisma/client.js';
import { PublicUserDto } from '../common/dto/public-user.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import type {
  UpdateLocationDto,
  UpdateUserDto,
} from './dto/update-user.dto.js';
import type { UpdateWorkerProfileDto } from './dto/update-worker-profile.dto.js';
import type { WorkerCvDto } from './dto/worker-cv.dto.js';

const reviewInclude = {
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
  photos: { orderBy: { order: 'asc' } },
} satisfies Prisma.ReviewInclude;

const cvInclude = {
  workerProfile: true,
  reviewsReceived: {
    orderBy: { createdAt: 'desc' },
    include: reviewInclude,
  },
} satisfies Prisma.UserInclude;

type UserWithCv = Prisma.UserGetPayload<{ include: typeof cvInclude }>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async updateMe(userId: string, dto: UpdateUserDto): Promise<PublicUserDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        city: dto.city,
        address: dto.address,
      },
      include: { workerProfile: true },
    });

    return PublicUserDto.fromUser(user);
  }

  async uploadAvatar(
    userId: string,
    file?: Express.Multer.File,
  ): Promise<PublicUserDto> {
    if (!file) {
      throw new BadRequestException('Debes subir una imagen');
    }

    const previous = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    const [avatarUrl] = await this.storage.saveWebpImages([file], {
      folder: 'avatars',
      min: 1,
      max: 1,
      width: 512,
      quality: 82,
    });

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      include: { workerProfile: true },
    });

    if (previous?.avatarUrl) {
      await this.storage.deleteFiles([previous.avatarUrl]);
    }

    return PublicUserDto.fromUser(user);
  }

  async updateLocation(
    userId: string,
    dto: UpdateLocationDto,
  ): Promise<PublicUserDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        city: dto.city,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
      include: { workerProfile: true },
    });

    return PublicUserDto.fromUser(user);
  }

  async getWorkerProfile(userId: string): Promise<WorkerCvDto> {
    const user = await this.findWorkerWithCv(userId);
    return this.toWorkerCv(user);
  }

  async updateWorkerProfile(
    userId: string,
    dto: UpdateWorkerProfileDto,
  ): Promise<WorkerCvDto> {
    const data = {
      headline: dto.headline,
      bio: dto.bio,
      categories: dto.categories,
      skills: dto.skills,
      experienceYears: dto.experienceYears,
      hourlyRate: dto.hourlyRate,
      currency: dto.currency,
      isAvailable: dto.isAvailable,
    };

    await this.prisma.workerProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    return this.getWorkerProfile(userId);
  }

  async getWorkerPublicProfile(workerId: string, viewerId?: string, viewerRole?: string): Promise<WorkerCvDto> {
    const user = await this.findWorkerWithCv(workerId);
    const cv = this.toWorkerCv(user);
    // Hide phone for homeowners viewing other workers
    if (viewerRole === Role.HOMEOWNER && viewerId !== workerId) {
      cv.phone = null;
    }
    // Also don't expose id unnecessarily? id is part of DTO but maybe keep minimal
    return cv;
  }

  private async findWorkerWithCv(userId: string): Promise<UserWithCv> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, role: Role.WORKER },
      include: cvInclude,
    });

    if (!user) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    return user;
  }

  private toWorkerCv(user: UserWithCv): WorkerCvDto {
    const profile = user.workerProfile;

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      city: user.city,
      phone: user.phone,
      headline: profile?.headline ?? null,
      bio: profile?.bio ?? null,
      categories: profile?.categories ?? [],
      skills: profile?.skills ?? [],
      experienceYears: profile?.experienceYears ?? null,
      hourlyRate:
        profile?.hourlyRate !== null && profile?.hourlyRate !== undefined
          ? Number(profile.hourlyRate)
          : null,
      currency: profile?.currency ?? Currency.PEN,
      isAvailable: profile?.isAvailable ?? false,
      averageRating: profile?.averageRating ?? 0,
      completedJobs: profile?.completedJobs ?? 0,
      reviews: user.reviewsReceived.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        author: review.author,
        job: {
          id: review.job.id,
          title: review.job.title,
          category: review.job.category,
          city: review.job.city,
        },
        photos: review.photos.map((photo) => photo.url),
      })),
    };
  }
}
