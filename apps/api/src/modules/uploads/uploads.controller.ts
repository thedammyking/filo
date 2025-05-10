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
import type {
  UploadStatus,
  PaginatedResponse,
  UploadResponse as UploadResponseType
} from '@filo/interfaces';
import { UploadsService } from './uploads.service';
import { UPLOAD_STATUS } from '@filo/libs/constants';
import type { Upload } from './entities/upload.entity';
import { PaginatedResponseDto } from '@/utils/pagination.dto';
import { UploadProducerService } from '@/modules/queue/producers/upload.producer.service';

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
  ): Promise<UploadResponseType[]> {
    this.logger.log(
      `[${user.id}] createUploads - Request received. StorageId: ${createUploadDto.storageId}, Links: ${createUploadDto.links.length}`
    );
    const createdUploads = await this.uploadsService.createUploads(createUploadDto, user.id);
    this.logger.log(
      `[${user.id}] createUploads - Created ${createdUploads.length} upload records.`
    );

    if (createdUploads && createdUploads.length > 0) {
      const jobData = createdUploads.map(upload => ({
        uploadId: upload.id
      }));
      try {
        await this.uploadProducerService.addMultipleUploadJobs(jobData);
        this.logger.log(
          `[${user.id}] createUploads - Added ${jobData.length} upload jobs to the queue.`
        );
      } catch (error) {
        this.logger.error(
          `[${user.id}] createUploads - Failed to add upload jobs to the queue: ${error.message}`,
          error.stack
        );
        // Potentially rethrow or handle this error depending on desired behavior
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
    type: PaginatedResponseDto<UploadResponseType>
  })
  async findAll(
    @CurrentUser() user: User,
    @Query('status') status?: UploadStatus,
    @Query('storageId') storageId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ): Promise<PaginatedResponse<UploadResponseType>> {
    this.logger.log(
      `[${user.id}] findAll - Request received. Status: ${status}, StorageId: ${storageId}, Page: ${page}, Limit: ${limit}`
    );
    const result = await this.uploadsService.findAll(user.id, { page, limit }, status, storageId);
    this.logger.log(
      `[${user.id}] findAll - Returning ${result.data.length} uploads (Total: ${result.metadata.pagination.total})`
    );
    return result;
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
  ): Promise<PaginatedResponse<UploadResponseType>> {
    this.logger.log(
      `[${user.id}] findPending - Request received. StorageId: ${storageId}, Page: ${page}, Limit: ${limit}`
    );
    const result = await this.uploadsService.findAll(
      user.id,
      { page, limit },
      UPLOAD_STATUS.PENDING,
      storageId
    );
    this.logger.log(
      `[${user.id}] findPending - Returning ${result.data.length} pending uploads (Total: ${result.metadata.pagination.total})`
    );
    return result;
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
  ): Promise<UploadResponseType> {
    this.logger.log(`[${user.id}] findOne - Request received for ID: ${id}`);
    const upload = await this.uploadsService.findOne(id, user.id);
    this.logger.log(`[${user.id}] findOne - Returning upload ID: ${id}`);
    return upload;
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
  ): Promise<UploadResponseType> {
    this.logger.log(
      `[${user.id}] update - Request received for ID: ${id}. Status: ${updateUploadDto.status ?? 'N/A'}`
    );
    const updatedUpload = await this.uploadsService.update(id, updateUploadDto, user.id);
    this.logger.log(`[${user.id}] update - Updated upload ID: ${id}`);
    return updatedUpload;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete upload by ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Upload deleted successfully'
  })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User): Promise<void> {
    this.logger.log(`[${user.id}] remove - Request received for ID: ${id}`);
    await this.uploadsService.remove(id, user.id);
    this.logger.log(`[${user.id}] remove - Deleted upload ID: ${id}`);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending upload' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Upload cancelled successfully',
    type: UploadResponse
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Upload not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Upload cannot be cancelled (not pending)'
  })
  async cancelUpload(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ): Promise<UploadResponseType> {
    this.logger.log(`[${user.id}] cancelUpload - Request received for ID: ${id}`);
    const cancelledUpload = await this.uploadsService.cancelUpload(id, user.id);
    this.logger.log(`[${user.id}] cancelUpload - Cancelled upload ID: ${id}`);
    return cancelledUpload; // Assuming UploadResponse is compatible with Upload entity
  }
}
