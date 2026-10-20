import { BadRequestException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export function imageFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (!file.mimetype.startsWith('image/')) {
    callback(new BadRequestException('Solo se permiten imagenes'), false);
    return;
  }

  callback(null, true);
}

/**
 * Interceptor de subida de imagenes en memoria (campo "photos").
 * La conversion a webp la realiza StorageService.
 */
export function photoUploadInterceptor(maxCount: number) {
  return FilesInterceptor('photos', maxCount, {
    fileFilter: imageFileFilter,
    limits: { fileSize: MAX_IMAGE_SIZE },
  });
}
