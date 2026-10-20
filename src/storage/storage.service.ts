import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

export interface SaveImageOptions {
  folder: string;
  min?: number;
  max?: number;
  width?: number;
  quality?: number;
}

/**
 * Guarda imagenes en disco local convirtiendolas a webp para reducir peso.
 * Devuelve rutas publicas relativas, p. ej. /uploads/jobs/<uuid>.webp
 */
@Injectable()
export class StorageService {
  private readonly uploadDir: string;
  private readonly privateDir: string;

  constructor(config: ConfigService) {
    this.uploadDir = resolve(
      process.cwd(),
      config.get<string>('UPLOAD_DIR', 'uploads'),
    );
    this.privateDir = resolve(
      process.cwd(),
      config.get<string>('PRIVATE_UPLOAD_DIR', 'identity-docs'),
    );
  }

  getUploadDir(): string {
    return this.uploadDir;
  }

  getPrivateDir(): string {
    return this.privateDir;
  }

  async saveWebpImages(
    files: Express.Multer.File[] = [],
    options: SaveImageOptions,
  ): Promise<string[]> {
    const paths = await this.writeWebpImages(this.uploadDir, files, options);
    return paths.map((path) => `/uploads/${path}`);
  }

  /**
   * Igual que saveWebpImages pero en el directorio privado (no servido por
   * /uploads). Devuelve rutas relativas, p. ej. identity/<uuid>.webp
   */
  async savePrivateWebpImages(
    files: Express.Multer.File[] = [],
    options: SaveImageOptions,
  ): Promise<string[]> {
    return this.writeWebpImages(this.privateDir, files, options);
  }

  private async writeWebpImages(
    root: string,
    files: Express.Multer.File[],
    options: SaveImageOptions,
  ): Promise<string[]> {
    const { folder, min = 0, max = 3, width = 1600, quality = 80 } = options;

    if (files.length < min) {
      throw new BadRequestException(
        `Se requieren al menos ${min} imagen(es)`,
      );
    }

    if (files.length > max) {
      throw new BadRequestException(
        `Se permiten como maximo ${max} imagen(es)`,
      );
    }

    const targetDir = join(root, folder);
    await mkdir(targetDir, { recursive: true });

    const paths: string[] = [];

    for (const file of files) {
      let buffer: Buffer;

      try {
        buffer = await sharp(file.buffer)
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality })
          .toBuffer();
      } catch {
        throw new BadRequestException('Una de las imagenes no es valida');
      }

      const filename = `${randomUUID()}.webp`;
      await writeFile(join(targetDir, filename), buffer);
      paths.push(`${folder}/${filename}`);
    }

    return paths;
  }

  async deleteFiles(urls: string[]): Promise<void> {
    await Promise.all(
      urls.map(async (url) => {
        const relative = url.replace(/^\/uploads\//, '');
        const full = join(this.uploadDir, relative);
        await unlink(full).catch(() => undefined);
      }),
    );
  }

  async deletePrivateFiles(paths: string[]): Promise<void> {
    await Promise.all(
      paths
        .filter((path): path is string => Boolean(path))
        .map(async (path) => {
          const full = join(this.privateDir, path);
          await unlink(full).catch(() => undefined);
        }),
    );
  }
}
