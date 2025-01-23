import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { google } from 'googleapis';
import { Repository, LessThan } from 'typeorm';
import { addDays } from 'date-fns';

import { STORAGE_PROVIDER } from '@filo/libs/constants';

import { Storage } from '../entities/storage.entity';
import { IStorageProvider } from '@filo/interfaces';
import { GoogleDriveException } from '../exceptions/google-drive.exception';
import type {
  GetAuthUrlResponse,
  RemoveConnectionResponse,
  SaveStorageTokensResponse,
  StorageClient,
  StorageTokens
} from '@filo/interfaces';

// Add custom exceptions at the top

@Injectable()
export class GoogleDriveProvider implements IStorageProvider {
  private readonly MAX_REFRESH_RETRIES = 3;
  private readonly logger = new Logger(GoogleDriveProvider.name);

  private oauth2Client;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Storage)
    private storageRepository: Repository<Storage>
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_REDIRECT_URI')
    );
  }

  getAuthUrl(): GetAuthUrlResponse {
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ];

    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      include_granted_scopes: true,
      response_type: 'code'
    });

    return { url };
  }

  async saveStorageTokens(code: string, userId: string): Promise<SaveStorageTokensResponse> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      await this.saveStorage(userId, tokens);
      return { success: true };
    } catch (error) {
      throw new UnauthorizedException('Failed to get Google tokens');
    }
  }

  private async saveStorage(userId: string, tokens: StorageTokens) {
    try {
      let storage = await this.storageRepository.findOne({
        where: {
          userId,
          provider: STORAGE_PROVIDER.GOOGLE_DRIVE
        }
      });

      const updates = {
        accessToken: tokens.access_token,
        expiryDate: tokens.expiry_date,
        lastUpdated: new Date()
      };

      if (tokens.refresh_token) {
        updates['refreshToken'] = tokens.refresh_token;
        updates['refreshTokenExpiresAt'] = addDays(new Date(), 200);
      }

      if (storage) {
        Object.assign(storage, updates);
      } else {
        storage = this.storageRepository.create({
          userId,
          provider: STORAGE_PROVIDER.GOOGLE_DRIVE,
          ...updates
        });
      }

      await this.storageRepository.save(storage);
    } catch (error) {
      this.logger.error('Failed to save storage tokens', {
        userId,
        error: error.message,
        stack: error.stack
      });
      throw new GoogleDriveException('Failed to save storage tokens');
    }
  }

  private async cleanupExpiredTokens() {
    await this.storageRepository.delete({
      refreshTokenExpiresAt: LessThan(new Date())
    });
  }

  async getStorageClient(userId: string): Promise<StorageClient> {
    // Clean up expired tokens first
    await this.cleanupExpiredTokens();

    const storage = await this.storageRepository.findOne({
      where: {
        userId,
        provider: STORAGE_PROVIDER.GOOGLE_DRIVE
      }
    });

    if (!storage) {
      throw new UnauthorizedException('No tokens found for this user');
    }

    if (storage.refreshTokenExpiresAt && new Date() > storage.refreshTokenExpiresAt) {
      // Remove the expired storage
      await this.storageRepository.remove(storage);
      throw new UnauthorizedException(
        'Refresh token has expired. Please reconnect your Google Drive account.'
      );
    }

    const tokens = {
      access_token: storage.accessToken,
      refresh_token: storage.refreshToken,
      expiry_date: storage.expiryDate
    };

    if (tokens.expiry_date && Date.now() > tokens.expiry_date) {
      try {
        const newTokens = await this.refreshAccessToken(userId);
        tokens.access_token = newTokens.access_token;
        tokens.expiry_date = newTokens.expiry_date;
      } catch (error) {
        if (error.message.includes('invalid_grant')) {
          throw new UnauthorizedException(
            'Your Google Drive connection needs to be renewed. Please reconnect your account.'
          );
        }
        throw error;
      }
    }

    this.oauth2Client.setCredentials(tokens);
    return google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  async refreshAccessToken(userId: string, retryCount = 0): Promise<StorageTokens> {
    try {
      const storage = await this.storageRepository.findOne({
        where: {
          userId,
          provider: STORAGE_PROVIDER.GOOGLE_DRIVE
        }
      });

      if (!storage?.refreshToken) {
        if (storage) await this.storageRepository.remove(storage);
        throw new GoogleDriveException('No refresh token found', 'NO_REFRESH_TOKEN');
      }

      // Add rate limiting protection
      if (storage.lastUpdated && Date.now() - storage.lastUpdated.getTime() < 1000) {
        throw new GoogleDriveException('Too many token refresh attempts', 'RATE_LIMIT');
      }

      this.oauth2Client.setCredentials({
        refresh_token: storage.refreshToken
      });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      await this.saveStorage(userId, credentials);
      return credentials;
    } catch (error) {
      if (error.message.includes('invalid_grant')) {
        await this.handleInvalidGrant(userId);
        throw new GoogleDriveException('Invalid refresh token', 'INVALID_GRANT');
      }

      // Implement retry logic
      if (retryCount < this.MAX_REFRESH_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.refreshAccessToken(userId, retryCount + 1);
      }

      this.logger.error('Failed to refresh access token', {
        userId,
        error: error.message,
        retryCount
      });
      throw new GoogleDriveException('Failed to refresh access token', 'REFRESH_FAILED');
    }
  }

  private async handleInvalidGrant(userId: string): Promise<void> {
    const storage = await this.storageRepository.findOne({
      where: {
        userId,
        provider: STORAGE_PROVIDER.GOOGLE_DRIVE
      }
    });
    if (storage) await this.storageRepository.remove(storage);
  }

  private async revokeToken(token: string): Promise<void> {
    if (!token) return;

    try {
      await this.oauth2Client.revokeToken(token);
    } catch (error) {
      this.logger.warn('Failed to revoke token', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  async removeConnection(userId: string): Promise<RemoveConnectionResponse> {
    const storage = await this.storageRepository.findOne({
      where: {
        userId,
        provider: STORAGE_PROVIDER.GOOGLE_DRIVE
      }
    });

    if (!storage) {
      throw new GoogleDriveException('No Google Drive connection found');
    }

    // Try to refresh token if expired
    if (Date.now() > storage.expiryDate) {
      try {
        const credentials = await this.refreshAccessToken(userId);
        storage.accessToken = credentials.access_token;
      } catch (error) {
        this.logger.warn('Failed to refresh token during removal', {
          userId,
          error: error.message
        });
      }
    }

    // Revoke both tokens
    await Promise.all([
      this.revokeToken(storage.accessToken),
      this.revokeToken(storage.refreshToken)
    ]);

    // Remove storage record
    await this.storageRepository.remove(storage);
    return { success: true };
  }

  async checkConnection(userId: string) {
    const storage = await this.storageRepository.findOne({
      where: { userId, provider: STORAGE_PROVIDER.GOOGLE_DRIVE }
    });
    return { connected: !!storage };
  }
}
