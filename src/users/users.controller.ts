import {
  Body,
  Controller,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  imageFileFilter,
  MAX_IMAGE_SIZE,
} from '../common/upload/image-upload.js';
import { PublicUserDto } from '../common/dto/public-user.dto.js';
import {
  UpdateLocationDto,
  UpdateUserDto,
} from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';

const avatarUpload = FileInterceptor('avatar', {
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE },
});

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @ApiOkResponse({ type: PublicUserDto })
  updateMe(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateUserDto,
  ): Promise<PublicUserDto> {
    return this.usersService.updateMe(userId, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(avatarUpload)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { avatar: { type: 'string', format: 'binary' } },
      required: ['avatar'],
    },
  })
  @ApiOkResponse({ type: PublicUserDto })
  uploadAvatar(
    @CurrentUser('userId') userId: string,
    @UploadedFile() avatar: Express.Multer.File,
  ): Promise<PublicUserDto> {
    return this.usersService.uploadAvatar(userId, avatar);
  }

  @Patch('me/location')
  @ApiOkResponse({ type: PublicUserDto })
  updateLocation(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateLocationDto,
  ): Promise<PublicUserDto> {
    return this.usersService.updateLocation(userId, dto);
  }
}
