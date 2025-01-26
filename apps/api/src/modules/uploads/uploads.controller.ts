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
  UseInterceptors
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '@/commons/decorators/current-user.decorator';
import type { User } from '@filo/interfaces';
import { CreateUploadDto, UpdateUploadDto, UploadResponse } from './dto/upload.dto';
import type { UploadStatus } from '@filo/interfaces';
import { UploadsService } from './uploads.service';
import { UPLOAD_STATUS } from '@filo/libs/constants';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseInterceptors(ClassSerializerInterceptor)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

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
    return await this.uploadsService.createUploads(createUploadDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all uploads' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: UPLOAD_STATUS
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all uploads',
    type: [UploadResponse]
  })
  async findAll(
    @CurrentUser() user: User,
    @Query('status') status?: UploadStatus
  ): Promise<UploadResponse[]> {
    return await this.uploadsService.findAll(user.id, status);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get all pending uploads' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all pending uploads',
    type: [UploadResponse]
  })
  async findPending(@CurrentUser() user: User): Promise<UploadResponse[]> {
    return await this.uploadsService.findAll(user.id, UPLOAD_STATUS.PENDING);
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
