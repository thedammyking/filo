import { Injectable, UnauthorizedException } from '@nestjs/common';

import { StorageProvider } from './constants/storage-provider.enum';
import { GoogleDriveProvider } from './providers/google-drive.provider';
import type { IStorageProvider } from './interfaces/storage-provider.interface';

@Injectable()
export class StorageService {
  private providers: Map<StorageProvider, any>;

  constructor(private googleDriveProvider: GoogleDriveProvider) {
    this.providers = new Map([[StorageProvider.GOOGLE_DRIVE, googleDriveProvider]]);
  }

  getProvider(provider: StorageProvider): IStorageProvider {
    const storageProvider = this.providers.get(provider);
    if (!storageProvider) {
      throw new UnauthorizedException('Storage provider not supported');
    }
    return storageProvider;
  }
}
