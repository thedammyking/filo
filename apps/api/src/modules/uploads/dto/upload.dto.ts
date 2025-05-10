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
  Min,
  IsDateString,
  Matches
} from 'class-validator';
import { type UploadStatus, type UploadType } from '@filo/interfaces';
import { UPLOAD_STATUS, UPLOAD_TYPE } from '@filo/libs/constants';
import { Type } from 'class-transformer';
import type { Storage } from '@/modules/storage/entities/storage.entity';

export class LinkDto {
  @ApiProperty({
    description: 'Download or magnet link'
  })
  @IsString()
  @Matches(
    /^(https:\/\/[^\s]+|magnet:\?(?:xt=urn:[a-z0-9]+:[a-zA-Z0-9]{32,}|xl=\d+|dn=[^&]+|tr=[^&]+|kt=[^&]+|mt=[^&]+|xs=[^&]+|as=[^&]+|ws=[^&]+)(?:&(?:xt=urn:[a-z0-9]+:[a-zA-Z0-9]{32,}|xl=\d+|dn=[^&]+|tr=[^&]+|kt=[^&]+|mt=[^&]+|xs=[^&]+|as=[^&]+|ws=[^&]+))*)$/,
    {
      message: 'Link must be either a valid HTTPS URL or a valid magnet link'
    }
  )
  @IsOptional()
  link?: string;

  @ApiProperty({
    enum: UPLOAD_TYPE,
    description: 'Type of the link'
  })
  @IsEnum(UPLOAD_TYPE)
  type: UploadType;

  @ApiProperty({
    type: String,
    description: 'File name'
  })
  @IsString()
  @IsOptional()
  fileName?: string;
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
  @IsNumber()
  @Min(0)
  progress?: number;

  @ApiProperty({
    type: String,
    description: 'File name'
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiProperty({
    description: 'Error message if the upload failed',
    type: String,
    nullable: true
  })
  @IsOptional()
  @IsString()
  error?: string | null;

  @ApiProperty({
    description: 'Size of the uploaded file in bytes',
    type: Number,
    nullable: true
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fileSize?: number;

  @ApiProperty({
    description: 'Completed at',
    type: Date,
    nullable: true
  })
  @IsOptional()
  @IsDateString()
  completedAt?: Date;
}

export class StorageResponse {
  id: string;
  provider: string;
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
  storage: StorageResponse;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  completedAt: Date;

  @ApiProperty({ nullable: true })
  fileSize?: number;

  @ApiProperty({ nullable: true })
  error?: string;
}
