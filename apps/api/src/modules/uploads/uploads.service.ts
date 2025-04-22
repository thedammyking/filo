import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger
} from '@nestjs/common';
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
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    @InjectRepository(Upload)
    private uploadsRepository: Repository<Upload>,
    @InjectRepository(Storage)
    private storageRepository: Repository<Storage>
  ) {}

  async createUploads({ links, ...createUploadDto }: CreateUploadDto, userId: string) {
    this.logger.log(
      `[${userId}] createUploads - Attempting to create uploads. StorageId: ${createUploadDto.storageId}, Links: ${links.length}`
    );
    try {
      const storage = await this.storageRepository.findOne({
        where: { id: createUploadDto.storageId, userId }
      });

      if (!storage) {
        this.logger.warn(
          `[${userId}] createUploads - Storage not found for ID: ${createUploadDto.storageId}`
        );
        throw new NotFoundException(`Storage with ID "${createUploadDto.storageId}" not found`);
      }

      this.logger.log(
        `[${userId}] createUploads - Found storage ${storage.id}. Creating upload entities.`
      );

      const uploadsToCreate = links.map(link =>
        this.uploadsRepository.create({
          ...createUploadDto,
          ...link,
          userId,
          storage
        })
      );

      const savedUploads = await this.uploadsRepository.save(uploadsToCreate);
      this.logger.log(
        `[${userId}] createUploads - Successfully saved ${savedUploads.length} upload records.`
      );
      return savedUploads;
    } catch (error) {
      this.logger.error(
        `[${userId}] createUploads - Failed for storageId ${createUploadDto.storageId}: ${error.message}`,
        error.stack
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create uploads');
    }
  }

  async findAll(
    userId: string,
    paginationDto: PaginationDto,
    status?: UploadStatus,
    storageId?: string
  ): Promise<PaginatedResponse<Upload>> {
    this.logger.log(
      `[${userId}] findAll - Fetching uploads. Status: ${status}, StorageId: ${storageId}, Page: ${paginationDto.page}, Limit: ${paginationDto.limit}`
    );
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

      this.logger.log(
        `[${userId}] findAll - Found ${data.length} uploads (Total: ${total}) matching criteria.`
      );
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
      this.logger.error(
        `[${userId}] findAll - Failed to fetch uploads: ${error.message}`,
        error.stack
      );
      throw new InternalServerErrorException('Failed to find uploads');
    }
  }

  async findOne(id: string, userId: string) {
    this.logger.log(`[${userId}] findOne - Fetching upload by ID: ${id}`);
    try {
      const upload = await this.uploadsRepository.findOne({
        where: { id, userId },
        relations: { storage: true }
      });

      if (!upload) {
        this.logger.warn(`[${userId}] findOne - Upload not found for ID: ${id}`);
        throw new NotFoundException(`Upload with ID "${id}" not found`);
      }

      this.logger.log(`[${userId}] findOne - Successfully found upload ID: ${id}`);
      return upload;
    } catch (error) {
      this.logger.error(`[${userId}] findOne - Failed for ID ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to find upload');
    }
  }

  /**
   * Internal method to find an upload by ID without user check.
   * Ensures the storage relation is loaded.
   * Used by background processes like queue consumers.
   */
  async _internalFindOneById(id: string): Promise<Upload | null> {
    this.logger.log(`[_internal] _internalFindOneById - Fetching upload by ID: ${id}`);
    try {
      const upload = await this.uploadsRepository.findOne({
        where: { id },
        relations: { storage: true }
      });

      if (!upload) {
        this.logger.warn(`[_internal] _internalFindOneById - Upload not found for ID: ${id}`);
        return null;
      }

      this.logger.log(`[_internal] _internalFindOneById - Successfully found upload ID: ${id}`);
      return upload;
    } catch (error) {
      this.logger.error(
        `[_internal] _internalFindOneById - Failed for ID ${id}: ${error.message}`,
        error.stack
      );
      throw new InternalServerErrorException(`Internal find failed for upload ID "${id}"`);
    }
  }

  async update(id: string, updateUploadDto: UpdateUploadDto, userId?: string) {
    const context = userId ? `[${userId}]` : '[_internal]';
    this.logger.log(`${context} update - Attempting to update upload ID: ${id}`);
    try {
      const upload = userId ? await this.findOne(id, userId) : await this._internalFindOneById(id);

      if (!upload) {
        if (!userId) {
          throw new NotFoundException(`Internal update: Upload with ID \"${id}\" not found`);
        }
        return;
      }

      const isCompleting = updateUploadDto.status === UPLOAD_STATUS.SUCCESS && !upload.completedAt;
      if (isCompleting) {
        this.logger.log(`${context} update - Marking upload ID ${id} as completed.`);
        upload.completedAt = new Date();
      }

      Object.assign(upload, updateUploadDto);
      const updatedUpload = await this.uploadsRepository.save(upload);
      this.logger.log(`${context} update - Successfully updated upload ID: ${id}`);
      return updatedUpload;
    } catch (error) {
      this.logger.error(`${context} update - Failed for ID ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update upload');
    }
  }

  async remove(id: string, userId: string) {
    this.logger.log(`[${userId}] remove - Attempting to remove upload ID: ${id}`);
    try {
      const upload = await this.findOne(id, userId);
      await this.uploadsRepository.remove(upload);
      this.logger.log(`[${userId}] remove - Successfully removed upload ID: ${id}`);
    } catch (error) {
      this.logger.error(`[${userId}] remove - Failed for ID ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to remove upload');
    }
  }
}
