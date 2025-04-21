import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Upload } from './entities/upload.entity';
import { CreateUploadDto, UpdateUploadDto } from './dto/upload.dto';
import type { UploadStatus } from '@filo/interfaces';
import { UPLOAD_STATUS } from '@filo/libs/constants';
import { Storage } from '@/modules/storage/entities/storage.entity';

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
          link: link.link,
          type: link.type,
          userId,
          storage
        })
      );

      return this.uploadsRepository.save(uploads);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create uploads');
    }
  }

  async findAll(userId: string, status?: UploadStatus) {
    try {
      const query = this.uploadsRepository
        .createQueryBuilder('upload')
        .where('upload.userId = :userId', { userId });

      if (status) {
        query.andWhere('upload.status = :status', { status });
      }

      return query.getMany();
    } catch (error) {
      throw new InternalServerErrorException('Failed to find uploads');
    }
  }

  async findOne(id: string, userId: string) {
    try {
      const upload = await this.uploadsRepository.findOne({
        where: { id, userId }
      });

      if (!upload) {
        throw new NotFoundException(`Upload with ID "${id}" not found`);
      }

      return upload;
    } catch (error) {
      throw new InternalServerErrorException('Failed to find upload');
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
      throw new InternalServerErrorException('Failed to update upload');
    }
  }

  async remove(id: string, userId: string) {
    try {
      const upload = await this.findOne(id, userId);
      await this.uploadsRepository.remove(upload);
    } catch (error) {
      throw new InternalServerErrorException('Failed to remove upload');
    }
  }
}
