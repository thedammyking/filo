import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
  Logger
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
  private readonly logger = new Logger(StorageService.name);
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
    this.logger.log(`getProvider - Attempting to retrieve provider: ${provider}`);
    const storageProvider = this.providers.get(provider);
    if (!storageProvider) {
      this.logger.error(`getProvider - Provider not found or configured: ${provider}`);
      throw new InternalServerErrorException(
        `Storage provider configuration error for: ${provider}`
      );
    }
    this.logger.log(`getProvider - Successfully retrieved provider: ${provider}`);
    return storageProvider;
  }

  async getAllStorages(userId: string): Promise<Storage[]> {
    this.logger.log(`[${userId}] getAllStorages - Fetching all storages`);
    const storages = await this.storageRepository.find({ where: { userId } });
    this.logger.log(`[${userId}] getAllStorages - Found ${storages.length} storages`);
    return storages;
  }

  async getStorage(userId: string, provider: StorageProvider): Promise<Storage> {
    this.logger.log(`[${userId}] getStorage - Fetching storage for provider: ${provider}`);
    const storage = await this.storageRepository.findOne({ where: { userId, provider } });
    if (!storage) {
      this.logger.warn(`[${userId}] getStorage - Storage not found for provider: ${provider}`);
    }
    this.logger.log(
      `[${userId}] getStorage - Found storage: ${storage ? storage.id : 'None'} for provider: ${provider}`
    );
    return storage;
  }

  async uploadStream(options: UploadStreamOptions): Promise<any> {
    const { storageId, userId, stream, filename, mimetype } = options;
    this.logger.log(
      `[${userId}] uploadStream - Initiating stream upload. StorageId: ${storageId}, Filename: ${filename}`
    );

    try {
      const storage = await this.storageRepository.findOne({ where: { id: storageId, userId } });

      if (!storage) {
        this.logger.warn(
          `[${userId}] uploadStream - Storage configuration not found for ID: ${storageId}`
        );
        throw new NotFoundException(
          `Storage configuration with ID "${storageId}" not found for the user.`
        );
      }

      this.logger.log(
        `[${userId}] uploadStream - Found storage config ${storageId}, proceeding with provider: ${storage.provider}`
      );
      const provider = this.getProvider(storage.provider);

      this.logger.log(
        `[${userId}] uploadStream - Calling ${storage.provider} provider's uploadStream method. Filename: ${filename}`
      );
      const result = await provider.uploadStream({
        stream,
        filename,
        mimetype,
        storageDetails: storage
      });

      this.logger.log(
        `[${userId}] uploadStream - Provider uploadStream completed successfully for storage ${storageId}, Filename: ${filename}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `[${userId}] uploadStream - Failed for storage ${storageId}, Filename: ${filename}. Error: ${error.message}`,
        error.stack
      );
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to upload stream for storage ${storageId}. Filename: ${filename}`
      );
    }
  }
}
