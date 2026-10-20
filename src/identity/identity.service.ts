import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import { Prisma } from '../generated/prisma/client.js';
import { IdVerificationStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { IdentityStatusDto } from './dto/identity-status.dto.js';
import type {
  IdentityFiles,
  UpdateIdentityDto,
} from './dto/update-identity.dto.js';
import {
  KYC_PROVIDER,
  type KycProvider,
} from './kyc/kyc-provider.interface.js';

const identityStatusSelect = {
  dniNumber: true,
  dniFrontPath: true,
  dniBackPath: true,
  selfiePath: true,
  idVerificationStatus: true,
  idVerifiedAt: true,
  idVerificationNote: true,
} satisfies Prisma.UserSelect;

const IDENTITY_FOLDER = 'identity';

type DocumentKind = 'dniFront' | 'dniBack' | 'selfie';

const documentFieldByKind: Record<
  DocumentKind,
  'dniFrontPath' | 'dniBackPath' | 'selfiePath'
> = {
  dniFront: 'dniFrontPath',
  dniBack: 'dniBackPath',
  selfie: 'selfiePath',
};

@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Inject(KYC_PROVIDER) private readonly kyc: KycProvider,
  ) {}

  async getStatus(userId: string): Promise<IdentityStatusDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: identityStatusSelect,
    });

    return IdentityStatusDto.fromUser(user);
  }

  async submit(
    userId: string,
    dto: UpdateIdentityDto,
    files: IdentityFiles,
  ): Promise<IdentityStatusDto> {
    const dniFront = files.dniFront?.[0];
    const dniBack = files.dniBack?.[0];
    const selfie = files.selfie?.[0];

    if (!dniFront || !dniBack || !selfie) {
      throw new BadRequestException(
        'Debes subir el frente del DNI, el reverso y una selfie',
      );
    }

    const previous = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        dniFrontPath: true,
        dniBackPath: true,
        selfiePath: true,
      },
    });

    const [dniFrontPath] = await this.storage.savePrivateWebpImages(
      [dniFront],
      { folder: IDENTITY_FOLDER, min: 1, max: 1, width: 1600, quality: 82 },
    );
    const [dniBackPath] = await this.storage.savePrivateWebpImages([dniBack], {
      folder: IDENTITY_FOLDER,
      min: 1,
      max: 1,
      width: 1600,
      quality: 82,
    });
    const [selfiePath] = await this.storage.savePrivateWebpImages([selfie], {
      folder: IDENTITY_FOLDER,
      min: 1,
      max: 1,
      width: 900,
      quality: 82,
    });

    const newPaths = [dniFrontPath, dniBackPath, selfiePath];

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          dniNumber: dto.dniNumber.replace(/\D/g, ''),
          dniFrontPath,
          dniBackPath,
          selfiePath,
          idVerificationStatus: IdVerificationStatus.PENDING,
          idVerifiedAt: null,
          idVerificationNote: null,
        },
      });
    } catch (error) {
      await this.storage.deletePrivateFiles(newPaths);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ese DNI ya esta registrado en otra cuenta',
        );
      }
      throw error;
    }

    const oldPaths = [
      previous?.dniFrontPath,
      previous?.dniBackPath,
      previous?.selfiePath,
    ].filter(
      (path): path is string =>
        Boolean(path) && !newPaths.includes(path as string),
    );
    if (oldPaths.length > 0) {
      await this.storage.deletePrivateFiles(oldPaths);
    }

    const result = await this.kyc.verify({
      dniNumber: dto.dniNumber,
      dniFrontBuffer: dniFront.buffer,
      selfieBuffer: selfie.buffer,
    });

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        idVerificationStatus: result.status,
        idVerifiedAt:
          result.status === 'VERIFIED' ? new Date() : null,
        idVerificationNote: result.note ?? null,
      },
      select: identityStatusSelect,
    });

    return IdentityStatusDto.fromUser(updated);
  }

  async getDocument(userId: string, kind: string) {
    const field = documentFieldByKind[kind as DocumentKind];

    if (!field) {
      throw new BadRequestException('Documento invalido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        dniFrontPath: true,
        dniBackPath: true,
        selfiePath: true,
      },
    });

    const relative = user?.[field] ?? null;

    if (!relative) {
      throw new NotFoundException('Documento no encontrado');
    }

    return {
      stream: createReadStream(join(this.storage.getPrivateDir(), relative)),
      filename: `${kind}.webp`,
    };
  }
}
