import type { StorageProvider, User } from '@filo/interfaces';
import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  Delete,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';

import { CurrentUser } from '@/commons/decorators/current-user.decorator';

import { STORAGE_PROVIDER } from '@filo/libs/constants';

import { StorageService } from './storage.service';
import {
  AuthUrlResponse,
  StorageTokenResponse,
  ConnectionStatusResponse,
  StorageResponse
} from './dto/storage.dto';

@ApiTags('storage')
@ApiBearerAuth()
@Controller('storage')
@UseInterceptors(ClassSerializerInterceptor)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('list')
  @ApiOperation({ summary: 'Get all storages' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All storages',
    type: StorageResponse,
    isArray: true
  })
  async getAllStorages(@CurrentUser() user: User) {
    return await this.storageService.getAllStorages(user.id);
  }

  @Get(':provider')
  @ApiOperation({ summary: 'Get a storage' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The storage',
    type: StorageResponse
  })
  async getStorage(@Param('provider') provider: StorageProvider, @CurrentUser() user: User) {
    return await this.storageService.getStorage(user.id, provider);
  }

  @Get(':provider/connect')
  @ApiOperation({ summary: 'Get OAuth authorization URL for a storage provider' })
  @ApiParam({
    name: 'provider',
    enum: STORAGE_PROVIDER,
    description: 'The storage provider to connect to'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The OAuth authorization URL',
    type: AuthUrlResponse
  })
  async getAuthUrl(@Param('provider') provider: StorageProvider): Promise<AuthUrlResponse> {
    const storageProvider = this.storageService.getProvider(provider);
    return await storageProvider.getAuthUrl();
  }

  @Get(':provider/callback')
  @ApiOperation({ summary: 'Handle OAuth callback from storage provider' })
  @ApiParam({
    name: 'provider',
    enum: STORAGE_PROVIDER,
    description: 'The storage provider that sent the callback'
  })
  @ApiQuery({
    name: 'code',
    description: 'The authorization code from the OAuth provider'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Storage tokens saved successfully',
    type: StorageTokenResponse
  })
  async handleCallback(
    @Param('provider') provider: StorageProvider,
    @Query('code') code: string,
    @CurrentUser() user: User
  ): Promise<StorageTokenResponse> {
    const storageProvider = this.storageService.getProvider(provider);
    return await storageProvider.saveStorageTokens(code, user.id);
  }

  @Get(':provider/connection')
  @ApiOperation({ summary: 'Check connection status with storage provider' })
  @ApiParam({
    name: 'provider',
    enum: STORAGE_PROVIDER,
    description: 'The storage provider to check connection for'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Connection status retrieved successfully',
    type: ConnectionStatusResponse
  })
  async checkConnection(
    @Param('provider') provider: StorageProvider,
    @CurrentUser() user: User
  ): Promise<ConnectionStatusResponse> {
    const storageProvider = this.storageService.getProvider(provider);
    return await storageProvider.checkConnection(user.id);
  }

  @Delete(':provider/connection')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove connection with storage provider' })
  @ApiParam({
    name: 'provider',
    enum: STORAGE_PROVIDER,
    description: 'The storage provider to disconnect from'
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Connection removed successfully'
  })
  async removeConnection(
    @Param('provider') provider: StorageProvider,
    @CurrentUser() user: User
  ): Promise<void> {
    const storageProvider = this.storageService.getProvider(provider);
    await storageProvider.removeConnection(user.id);
  }
}
