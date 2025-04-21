import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsArray, IsNotEmpty, IsUUID, ValidateNested } from 'class-validator';
import { type UploadStatus, type UploadType } from '@filo/interfaces';
import { UPLOAD_STATUS, UPLOAD_TYPE } from '@filo/libs/constants';
import type { Storage } from '@/modules/storage/entities/storage.entity';
import { Type } from 'class-transformer';

export class LinkDto {
  @ApiProperty({
    description: 'Download or magnet link'
  })
  @IsString()
  @IsNotEmpty()
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
