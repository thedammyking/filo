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

  getProvider(provider: StorageProvider): IStorageProvider {
    const storageProvider = this.providers.get(provider);
    if (!storageProvider) {
      throw new UnauthorizedException('Storage provider not supported');
    }
    return storageProvider;
  }

  async getAllStorages(userId: string): Promise<Storage[]> {
    return this.storageRepository.find({ where: { userId } });
  }

  async getStorage(userId: string, provider: StorageProvider): Promise<Storage> {
    return this.storageRepository.findOne({ where: { userId, provider } });
  }
}
