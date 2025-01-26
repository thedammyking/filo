import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsArray, IsNotEmpty, IsUUID } from 'class-validator';
import { type UploadStatus, type UploadType } from '@filo/interfaces';
import { UPLOAD_STATUS, UPLOAD_TYPE } from '@filo/libs/constants';
import type { Storage } from '@/modules/storage/entities/storage.entity';

export class CreateUploadDto {
  @ApiProperty({
    enum: UPLOAD_TYPE,
    description: 'Type of upload'
  })
  @IsEnum(UPLOAD_TYPE)
  type: UploadType;

  @ApiProperty({
    description: 'Storage ID to upload to'
  })
  @IsUUID()
  storageId: string;

  @ApiProperty({
    type: [String],
    description: 'Array of download or magnet links'
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  links: string[];
}

export class UpdateUploadDto {
  @ApiProperty({
    enum: UPLOAD_STATUS,
    description: 'Status of the upload'
  })
  @IsEnum(UPLOAD_STATUS)
  status?: UploadStatus;

  @ApiProperty({
    type: Number,
    description: 'Upload progress (0-100)'
  })
  progress?: number;
}

export class UploadResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  link: string;

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
