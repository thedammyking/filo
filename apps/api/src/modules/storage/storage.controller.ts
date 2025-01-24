import type { StorageProvider, User } from '@filo/interfaces';
import { Controller, Get, Param, Query, Res, Delete, HttpCode } from '@nestjs/common';

import { CurrentUser } from '@/commons/decorators/current-user.decorator';

import { STORAGE_PROVIDER_DETAILS } from '@filo/libs/constants';

import { StorageService } from './storage.service';
import type { Response } from 'express';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}
  @Get(':provider/connect')
  async getAuthUrl(@Param('provider') provider: StorageProvider) {
    const storageProvider = this.storageService.getProvider(provider);
    return await storageProvider.getAuthUrl();
  }

  @Get(':provider/callback')
  async handleCallback(
    @Param('provider') provider: StorageProvider,
    @Query('code') code: string,
    @CurrentUser() user: User
  ) {
    const storageProvider = this.storageService.getProvider(provider);
    return await storageProvider.saveStorageTokens(code, user.id);
  }

  @Get(':provider/files')
  async listFiles(@Param('provider') provider: StorageProvider, @CurrentUser() user: User) {
    const storageProvider = this.storageService.getProvider(provider);
    const client = await storageProvider.getStorageClient(user.id);
    const response = await client.files.list({
      pageSize: 10,
      fields: 'nextPageToken, files(id, name)'
    });
    return response.data.files;
  }

  @Delete(':provider/connection')
  @HttpCode(204)
  async removeConnection(@Param('provider') provider: StorageProvider, @CurrentUser() user: User) {
    const storageProvider = this.storageService.getProvider(provider);
    return await storageProvider.removeConnection(user.id);
  }

  @Get(':provider/connection')
  async checkConnection(@Param('provider') provider: StorageProvider, @CurrentUser() user: User) {
    const storageProvider = this.storageService.getProvider(provider);
    return await storageProvider.checkConnection(user.id);
  }
}
