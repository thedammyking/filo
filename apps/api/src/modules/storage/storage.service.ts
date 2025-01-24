import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Storage } from './entities/storage.entity';

import { STORAGE_PROVIDER } from '@filo/libs/constants';
import { GoogleDriveProvider } from './providers/google-drive.provider';
import type { IStorageProvider, StorageProvider } from '@filo/interfaces';

@Injectable()
export class StorageService {
  private providers: Map<StorageProvider, any>;

  constructor(
    @InjectRepository(Storage)
    private storageRepository: Repository<Storage>,
    private googleDriveProvider: GoogleDriveProvider
  ) {
    this.providers = new Map([[STORAGE_PROVIDER.GOOGLE_DRIVE, googleDriveProvider]]);
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
