import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  Patch,
  HttpCode,
  HttpStatus,
  ClassSerializerInterceptor,
  UseInterceptors,
  Logger
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '@/commons/decorators/current-user.decorator';
import type { User } from '@filo/interfaces';
import { CreateUploadDto, UpdateUploadDto, UploadResponse } from './dto/upload.dto';
import type { UploadStatus, PaginatedResponse } from '@filo/interfaces';
import { UploadsService } from './uploads.service';
import { UPLOAD_STATUS } from '@filo/libs/constants';
import type { Upload } from './entities/upload.entity';
import { PaginatedResponseDto } from '@/utils/pagination.dto';
import { UploadProducerService } from '@/queue/producers/upload.producer.service';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseInterceptors(ClassSerializerInterceptor)
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(
    private readonly uploadsService: UploadsService,
    private readonly uploadProducerService: UploadProducerService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create new uploads' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Uploads created successfully',
    type: [UploadResponse]
  })
  async createUploads(
    @Body() createUploadDto: CreateUploadDto,
    @CurrentUser() user: User
  ): Promise<UploadResponse[]> {
    const createdUploads = await this.uploadsService.createUploads(createUploadDto, user.id);

    if (createdUploads && createdUploads.length > 0) {
      const jobData = createdUploads.map(upload => ({
        uploadId: upload.id
      }));
      try {
        await this.uploadProducerService.addMultipleUploadJobs(jobData);
        this.logger.log(`Added ${jobData.length} upload jobs to the queue.`);
      } catch (error) {
        this.logger.error(`Failed to add upload jobs to the queue: ${error.message}`, error.stack);
      }
    }

    return createdUploads;
  }

  @Get()
  @ApiOperation({ summary: 'Get all uploads' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: UPLOAD_STATUS
  })
  @ApiQuery({
    name: 'storageId',
    required: false
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all uploads',
    type: PaginatedResponseDto<UploadResponse>
  })
  async findAll(
    @CurrentUser() user: User,
    @Query('status') status?: UploadStatus,
    @Query('storageId') storageId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ): Promise<PaginatedResponse<UploadResponse>> {
    return await this.uploadsService.findAll(user.id, { page, limit }, status, storageId);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get all pending uploads' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all pending uploads',
    type: PaginatedResponseDto<UploadResponse>
  })
  async findPending(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('storageId') storageId?: string
  ): Promise<PaginatedResponse<UploadResponse>> {
    return await this.uploadsService.findAll(
      user.id,
      { page, limit },
      UPLOAD_STATUS.PENDING,
      storageId
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get upload by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the upload',
    type: UploadResponse
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ): Promise<UploadResponse> {
    return await this.uploadsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update upload by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Upload updated successfully',
    type: UploadResponse
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUploadDto: UpdateUploadDto,
    @CurrentUser() user: User
  ): Promise<UploadResponse> {
    return await this.uploadsService.update(id, updateUploadDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete upload by ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Upload deleted successfully'
  })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User): Promise<void> {
    await this.uploadsService.remove(id, user.id);
  }
}
