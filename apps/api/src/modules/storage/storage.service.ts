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
import { MemoryMonitorService } from '../memory-monitor/memory-monitor.service';
import { ConfigService } from '@nestjs/config';

interface UploadStreamOptions {
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
  private currentChunkSize: number;

  constructor(
    @InjectRepository(Storage)
    private readonly storageRepository: Repository<Storage>,
    private readonly googleDriveProvider: GoogleDriveProvider,
    private readonly memoryMonitor: MemoryMonitorService,
    private readonly configService: ConfigService
  ) {
    this.providers = new Map<StorageProvider, IStorageProvider>([
      [STORAGE_PROVIDER.GOOGLE_DRIVE, googleDriveProvider]
    ]);

    const config = this.configService.get('memoryMonitor');
    if (!config) {
      throw new Error('Memory monitor configuration not found');
    }
    this.currentChunkSize = config.chunkSize.DEFAULT;
    this.memoryMonitor.startMonitoring(newSize => {
      this.currentChunkSize = newSize;
    });
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
    fileSize: number,
    onProgress: (progress: number) => void
  ): Transform {
    const logger = this.logger;
    let bytesProcessed = 0;
    let lastProgressUpdate = 0;
    const PROGRESS_UPDATE_THRESHOLD = 0.03; // Update every 3%

    return new Transform({
      transform(chunk, encoding, callback) {
        bytesProcessed += chunk.length;
        const progress = bytesProcessed / fileSize;

        // Only update if progress has increased by at least 3%
        if (progress - lastProgressUpdate >= PROGRESS_UPDATE_THRESHOLD) {
          const progressPercent = Math.floor(progress * 100);
          try {
            onProgress(progressPercent);
            lastProgressUpdate = progress;
          } catch (error) {
            logger.error(`Error updating progress: ${error.message}`);
          }
        }

        callback(null, chunk);
      }
    });
  }

  async uploadStream(
    stream: Readable | NodeJS.ReadableStream,
    options: UploadStreamOptions
  ): Promise<string> {
    const { fileSize, onProgress, ...uploadOptions } = options;

    // Create a progress tracking stream if fileSize and onProgress are provided
    const uploadStream =
      fileSize && onProgress
        ? stream.pipe(this.createProgressTrackingStream(fileSize, onProgress))
        : stream;

    // Use the current chunk size for the upload
    const uploadResult = await this.uploadToStorage(uploadStream, {
      ...uploadOptions,
      highWaterMark: this.currentChunkSize
    });

    return uploadResult;
  }

  private async uploadToStorage(
    stream: Readable | NodeJS.ReadableStream,
    options: {
      filename: string;
      storageId: string;
      userId: string;
      mimetype?: string;
      subdirectory?: string;
      highWaterMark: number;
    }
  ): Promise<string> {
    const { filename, storageId, userId, mimetype, subdirectory, highWaterMark } = options;
    this.logger.log(
      `[${userId}] uploadStream - Initiating stream upload. StorageId: ${storageId}, Filename: ${filename}, Subdirectory: ${subdirectory || 'N/A'}`
    );

    try {
      const storage = await this.storageRepository.findOne({
        where: { id: storageId, userId }
      });

      if (!storage) {
        throw new Error(`Storage not found for id: ${storageId}`);
      }

      const provider = this.getProvider(storage.provider);

      this.logger.log(
        `[${userId}] uploadStream - Calling ${storage.provider} provider's uploadStream method. Filename: ${filename}`
      );
      const result = await provider.uploadStream({
        stream,
        filename,
        mimetype,
        storageDetails: storage,
        subdirectory,
        fileSize: highWaterMark // Use highWaterMark as fileSize for now
      });

      this.logger.log(
        `[${userId}] uploadStream - Successfully uploaded stream to ${storage.provider}. Filename: ${filename}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `[${userId}] uploadStream - Error uploading stream: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
