import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  imageFileFilter,
  MAX_IMAGE_SIZE,
} from '../common/upload/image-upload.js';
import { IdentityStatusDto } from './dto/identity-status.dto.js';
import {
  UpdateIdentityDto,
  type IdentityFiles,
} from './dto/update-identity.dto.js';
import { IdentityService } from './identity.service.js';

const identityUpload = FileFieldsInterceptor(
  [
    { name: 'dniFront', maxCount: 1 },
    { name: 'dniBack', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
  ],
  {
    fileFilter: imageFileFilter,
    limits: { fileSize: MAX_IMAGE_SIZE },
  },
);

@ApiTags('Identity')
@ApiBearerAuth()
@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get()
  @ApiOperation({ summary: 'Estado de mi verificacion de identidad' })
  @ApiOkResponse({ type: IdentityStatusDto })
  getStatus(
    @CurrentUser('userId') userId: string,
  ): Promise<IdentityStatusDto> {
    return this.identityService.getStatus(userId);
  }

  @Post()
  @UseInterceptors(identityUpload)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Enviar DNI (frente y reverso) + selfie para verificar identidad',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        dniNumber: { type: 'string' },
        dniFront: { type: 'string', format: 'binary' },
        dniBack: { type: 'string', format: 'binary' },
        selfie: { type: 'string', format: 'binary' },
      },
      required: ['dniNumber', 'dniFront', 'dniBack', 'selfie'],
    },
  })
  @ApiOkResponse({ type: IdentityStatusDto })
  submit(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateIdentityDto,
    @UploadedFiles() files: IdentityFiles,
  ): Promise<IdentityStatusDto> {
    return this.identityService.submit(userId, dto, files ?? {});
  }

  @Get('documents/:kind')
  @ApiOperation({
    summary: 'Ver mis documentos (solo el dueno): kind = dniFront|dniBack|selfie',
  })
  async getDocument(
    @CurrentUser('userId') userId: string,
    @Param('kind') kind: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const document = await this.identityService.getDocument(userId, kind);

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${document.filename}"`,
    );

    return new StreamableFile(document.stream);
  }
}
