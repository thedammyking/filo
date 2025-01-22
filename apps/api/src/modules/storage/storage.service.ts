import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Storage } from './entities/storage.entity';

import { StorageProvider } from './constants/storage-provider.enum';
import { GoogleDriveProvider } from './providers/google-drive.provider';
import type { IStorageProvider } from './interfaces/storage-provider.interface';

@Injectable()
export class StorageService {
  private providers: Map<StorageProvider, any>;

  constructor(
    @InjectRepository(Storage)
    private storageRepository: Repository<Storage>,
    private googleDriveProvider: GoogleDriveProvider
  ) {
    this.providers = new Map([[StorageProvider.GOOGLE_DRIVE, googleDriveProvider]]);
  }

  // Run every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'cleanupExpiredTokens' })
  async cleanupExpiredTokens() {
    await this.storageRepository.delete({
      refreshTokenExpiresAt: LessThan(new Date())
    });
  }

  getProvider(provider: StorageProvider): IStorageProvider {
    const storageProvider = this.providers.get(provider);
    if (!storageProvider) {
      throw new UnauthorizedException('Storage provider not supported');
    }
    return storageProvider;
  }
}
