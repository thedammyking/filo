import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsArray,
  IsNotEmpty,
  IsUUID,
  ValidateNested,
  IsUrl,
  IsOptional,
  IsNumber,
  Min
} from 'class-validator';
import { type UploadStatus, type UploadType } from '@filo/interfaces';
import { UPLOAD_STATUS, UPLOAD_TYPE } from '@filo/libs/constants';
import type { Storage } from '@/modules/storage/entities/storage.entity';
import { Type } from 'class-transformer';

export class LinkDto {
  @ApiProperty({
    description: 'Download or magnet link'
  })
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  link: string;

  @ApiProperty({
    enum: UPLOAD_TYPE,
    description: 'Type of the link'
  })
  @IsEnum(UPLOAD_TYPE)
  type: UploadType;
}

export class CreateUploadDto {
  @ApiProperty({
    description: 'Storage ID to upload to'
  })
  @IsUUID()
  storageId: string;

  @ApiProperty({
    type: [LinkDto],
    description: 'Array of download or magnet links and their type'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkDto)
  links: LinkDto[];
}

export class UpdateUploadDto {
  @ApiProperty({
    enum: UPLOAD_STATUS,
    description: 'Status of the upload'
  })
  @IsOptional()
  @IsEnum(UPLOAD_STATUS)
  status?: UploadStatus;

  @ApiProperty({
    type: Number,
    description: 'Upload progress (0-100)'
  })
  @IsOptional()
  progress?: number;

  @ApiProperty({
    type: String,
    description: 'File name'
  })
  @IsOptional()
  fileName?: string;

  @ApiProperty({
    description: 'Error message if the upload failed',
    type: String,
    nullable: true
  })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiProperty({
    description: 'Size of the uploaded file in bytes',
    type: Number,
    nullable: true
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fileSize?: number;
}

export class UploadResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  link: string;

  @ApiProperty({ nullable: true })
  fileName: string;

  @ApiProperty({ enum: UPLOAD_TYPE })
  type: UploadType;

  @ApiProperty({ enum: UPLOAD_STATUS })
  status: UploadStatus;

  @ApiProperty()
  progress: number;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  storage: Storage;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  completedAt: Date;
}
