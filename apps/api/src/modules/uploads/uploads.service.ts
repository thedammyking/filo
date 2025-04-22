import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Upload } from './entities/upload.entity';
import { CreateUploadDto, UpdateUploadDto } from './dto/upload.dto';
import type { UploadStatus, PaginatedResponse } from '@filo/interfaces';
import { UPLOAD_STATUS } from '@filo/libs/constants';
import { Storage } from '@/modules/storage/entities/storage.entity';
import { PaginationDto } from '@/utils/pagination.dto';

@Injectable()
export class UploadsService {
  constructor(
    @InjectRepository(Upload)
    private uploadsRepository: Repository<Upload>,
    @InjectRepository(Storage)
    private storageRepository: Repository<Storage>
  ) {}

  async createUploads({ links, ...createUploadDto }: CreateUploadDto, userId: string) {
    try {
      const storage = await this.storageRepository.findOne({
        where: { id: createUploadDto.storageId }
      });

      if (!storage) {
        throw new NotFoundException(`Storage with ID "${createUploadDto.storageId}" not found`);
      }

      const uploads = links.map(link =>
        this.uploadsRepository.create({
          ...createUploadDto,
          ...link,
          userId,
          storage
        })
      );

      return this.uploadsRepository.save(uploads);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create uploads');
    }
  }

  async findAll(
    userId: string,
    paginationDto: PaginationDto,
    status?: UploadStatus,
    storageId?: string
  ): Promise<PaginatedResponse<Upload>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const query = this.uploadsRepository
        .createQueryBuilder('upload')
        .where('upload.userId = :userId', { userId });

      if (status) {
        query.andWhere('upload.status = :status', { status });
      }

      if (storageId) {
        query.andWhere('upload.storageId = :storageId', { storageId });
      }

      const [data, total] = await query.skip(skip).take(limit).getManyAndCount();

      return {
        data,
        metadata: {
          pagination: {
            total,
            page,
            limit
          }
        }
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to find uploads');
    }
  }

  async findOne(id: string, userId: string) {
    try {
      const upload = await this.uploadsRepository.findOne({
        where: { id, userId },
        relations: { storage: true }
      });

      if (!upload) {
        throw new NotFoundException(`Upload with ID "${id}" not found`);
      }

      return upload;
    } catch (error) {
      throw new InternalServerErrorException('Failed to find upload');
    }
  }

  /**
   * Internal method to find an upload by ID without user check.
   * Ensures the storage relation is loaded.
   * Used by background processes like queue consumers.
   */
  async _internalFindOneById(id: string): Promise<Upload | null> {
    try {
      const upload = await this.uploadsRepository.findOne({
        where: { id },
        relations: { storage: true }
      });

      if (!upload) {
        console.error(`Internal find: Upload with ID "${id}" not found.`);
        return null;
      }

      return upload;
    } catch (error) {
      console.error(`Internal find failed for upload ID "${id}":`, error);
      throw new InternalServerErrorException(`Internal find failed for upload ID "${id}"`);
    }
  }

  async update(id: string, updateUploadDto: UpdateUploadDto, userId: string) {
    try {
      const upload = await this.findOne(id, userId);

      if (updateUploadDto.status === UPLOAD_STATUS.SUCCESS && !upload.completedAt) {
        upload.completedAt = new Date();
      }

      Object.assign(upload, updateUploadDto);
      return this.uploadsRepository.save(upload);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update upload');
    }
  }

  async remove(id: string, userId: string) {
    try {
      const upload = await this.findOne(id, userId);
      await this.uploadsRepository.remove(upload);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to remove upload');
    }
  }
}
