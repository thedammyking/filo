import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
  Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Storage } from './entities/storage.entity';
import { Readable, Transform } from 'stream';

import { STORAGE_PROVIDER } from '@filo/libs/constants';
import { GoogleDriveProvider } from './providers/google-drive.provider';
import type { IStorageProvider, StorageProvider } from '@filo/interfaces';

interface UploadStreamOptions {
  stream: Readable | NodeJS.ReadableStream;
  filename: string;
  storageId: string;
  userId: string;
  mimetype?: string; // Optional: Mimetype might be useful for providers
  subdirectory?: string; // Added subdirectory for torrents
  fileSize?: number; // Added fileSize for potential use by providers (e.g., progress)
  onProgress?: (progress: number) => Promise<void>;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private providers: Map<StorageProvider, IStorageProvider>;

  constructor(
    @InjectRepository(Storage)
    private readonly storageRepository: Repository<Storage>,
    private readonly googleDriveProvider: GoogleDriveProvider
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

  private createProgressTrackingStream(
    stream: Readable,
    fileSize: number,
    onProgress: (progress: number) => Promise<void>
  ): Readable {
    let bytesProcessed = 0;
    let lastProgressUpdate = 0;
    const PROGRESS_UPDATE_THRESHOLD = 3; // Update every 3%
    const logger = this.logger;

    return stream.pipe(
      new Transform({
        transform(chunk, encoding, callback) {
          bytesProcessed += chunk.length;
          const currentProgress = Math.floor((bytesProcessed / fileSize) * 100);

          // Only update if we've crossed the threshold
          if (currentProgress - lastProgressUpdate >= PROGRESS_UPDATE_THRESHOLD) {
            onProgress(currentProgress).catch(error => {
              logger.error('Failed to update progress:', error);
            });
            lastProgressUpdate = currentProgress;
          }

          callback(null, chunk);
        }
      })
    );
  }

  async uploadStream(options: UploadStreamOptions): Promise<any> {
    const { storageId, userId, stream, filename, mimetype, subdirectory, fileSize, onProgress } =
      options;
    this.logger.log(
      `[${userId}] uploadStream - Initiating stream upload. StorageId: ${storageId}, Filename: ${filename}, Subdirectory: ${subdirectory || 'N/A'}`
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

      // Create progress tracking stream if fileSize and onProgress are provided
      const uploadStream =
        fileSize && onProgress
          ? this.createProgressTrackingStream(stream as Readable, fileSize, onProgress)
          : stream;

      this.logger.log(
        `[${userId}] uploadStream - Calling ${storage.provider} provider's uploadStream method. Filename: ${filename}`
      );
      const result = await provider.uploadStream({
        stream: uploadStream,
        filename,
        mimetype,
        storageDetails: storage,
        subdirectory,
        fileSize
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
