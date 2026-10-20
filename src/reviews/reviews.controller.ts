import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { photoUploadInterceptor } from '../common/upload/image-upload.js';
import { Role } from '../generated/prisma/enums.js';
import { CreateReviewDto, ReviewDto } from './dto/review.dto.js';
import { ReviewsService } from './reviews.service.js';

const MAX_REVIEW_PHOTOS = 3;
const photoUpload = photoUploadInterceptor(MAX_REVIEW_PHOTOS);

@ApiTags('Reviews')
@ApiBearerAuth()
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('jobs/:jobId/review')
  @Roles(Role.HOMEOWNER)
  @UseInterceptors(photoUpload)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Calificar el trabajo terminado (1 a 5) con 1-3 fotos del resultado',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        rating: { type: 'integer', minimum: 1, maximum: 5 },
        comment: { type: 'string' },
        photos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['rating'],
    },
  })
  @ApiCreatedResponse({ type: ReviewDto })
  create(
    @CurrentUser('userId') homeownerId: string,
    @Param('jobId') jobId: string,
    @Body() dto: CreateReviewDto,
    @UploadedFiles() photos: Express.Multer.File[],
  ): Promise<ReviewDto> {
    return this.reviewsService.create(jobId, homeownerId, dto, photos ?? []);
  }

  @Get('workers/:workerId/reviews')
  @ApiOperation({ summary: 'Resenas recibidas por un trabajador' })
  @ApiOkResponse({ type: [ReviewDto] })
  listByWorker(
    @Param('workerId') workerId: string,
  ): Promise<ReviewDto[]> {
    return this.reviewsService.listByWorker(workerId);
  }
}
