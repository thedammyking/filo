import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Storage } from './entities/storage.entity';
import type { Readable } from 'stream';

import { STORAGE_PROVIDER } from '@filo/libs/constants';
import { GoogleDriveProvider } from './providers/google-drive.provider';
import type { IStorageProvider, StorageProvider } from '@filo/interfaces';

interface UploadStreamOptions {
  stream: Readable;
  filename: string;
  storageId: string;
  userId: string;
  mimetype?: string; // Optional: Mimetype might be useful for providers
}

@Injectable()
export class StorageService {
  private providers: Map<StorageProvider, IStorageProvider>;

  constructor(
    @InjectRepository(Storage)
    private storageRepository: Repository<Storage>,
    private googleDriveProvider: GoogleDriveProvider
  ) {
    this.providers = new Map<StorageProvider, IStorageProvider>([
      [STORAGE_PROVIDER.GOOGLE_DRIVE, googleDriveProvider]
    ]);
  }

  getProvider(provider: StorageProvider): IStorageProvider {
    const storageProvider = this.providers.get(provider);
    if (!storageProvider) {
      throw new InternalServerErrorException(
        `Storage provider configuration error for: ${provider}`
      );
    }
    return storageProvider;
  }

  async getAllStorages(userId: string): Promise<Storage[]> {
    return this.storageRepository.find({ where: { userId } });
  }

  async getStorage(userId: string, provider: StorageProvider): Promise<Storage> {
    return this.storageRepository.findOne({ where: { userId, provider } });
  }

  async uploadStream(options: UploadStreamOptions): Promise<any> {
    const { storageId, userId, stream, filename, mimetype } = options;

    try {
      const storage = await this.storageRepository.findOne({ where: { id: storageId, userId } });

      if (!storage) {
        throw new NotFoundException(
          `Storage configuration with ID "${storageId}" not found for the user.`
        );
      }

      const provider = this.getProvider(storage.provider);

      const result = await provider.uploadStream({
        stream,
        filename,
        mimetype,
        storageDetails: storage
      });

      return result;
    } catch (error) {
      console.error(`Failed to upload stream for storage ${storageId}:`, error);
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to upload stream for storage ${storageId}.`);
    }
  }
}
