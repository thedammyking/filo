import type { User } from '@filo/types';
import { Controller, Get, Param, Query, Res, Delete, HttpCode } from '@nestjs/common';

import { CurrentUser } from '@/commons/decorators/current-user.decorator';

import { StorageProvider } from './constants/storage-provider.enum';
import { StorageService } from './storage.service';
import { Public } from '@/commons/decorators/public.decorator';
import type { Response } from 'express';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('providers')
  async getProviders() {
    return Object.values(StorageProvider);
  }

  @Get(':provider/connect')
  async getAuthUrl(@Param('provider') provider: StorageProvider) {
    const storageProvider = this.storageService.getProvider(provider);
    return { url: await storageProvider.getAuthUrl() };
  }

  @Get(':provider/callback')
  async handleCallback(
    @Param('provider') provider: StorageProvider,
    @Query('code') code: string,
    @CurrentUser() user: User,
    @Res() res: Response
  ) {
    const storageProvider = this.storageService.getProvider(provider);
    await storageProvider.getTokens(code, user.id);
    res.status(200).json({ message: 'Authentication successful' });
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
    await storageProvider.removeConnection(user.id);
  }

  @Get(':provider/connection')
  async checkConnection(@Param('provider') provider: StorageProvider, @CurrentUser() user: User) {
    const storageProvider = this.storageService.getProvider(provider);

    try {
      const connected = await storageProvider.checkConnection(user.id);
      return { connected };
    } catch (error) {
      return { connected: false };
    }
  }
}
