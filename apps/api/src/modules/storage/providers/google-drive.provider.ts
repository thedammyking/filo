import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { google } from 'googleapis';
import { Repository, LessThan } from 'typeorm';
import { addDays } from 'date-fns';

import { StorageProvider } from '../constants/storage-provider.enum';
import { Storage } from '../entities/storage.entity';
import { IStorageProvider, StorageTokens } from '../interfaces/storage-provider.interface';

@Injectable()
export class GoogleDriveProvider implements IStorageProvider {
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

  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      include_granted_scopes: true,
      response_type: 'code'
    });
  }

  async getTokens(code: string, userId: string): Promise<StorageTokens> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      await this.saveStorage(userId, tokens);
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Failed to get Google tokens');
    }
  }

  private async saveStorage(userId: string, tokens: StorageTokens) {
    let storage = await this.storageRepository.findOne({
      where: {
        userId,
        provider: StorageProvider.GOOGLE_DRIVE
      }
    });

    const updates = {
      accessToken: tokens.access_token,
      expiryDate: tokens.expiry_date
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
        provider: StorageProvider.GOOGLE_DRIVE,
        ...updates
      });
    }
    await this.storageRepository.save(storage);
  }

  private async cleanupExpiredTokens() {
    await this.storageRepository.delete({
      refreshTokenExpiresAt: LessThan(new Date())
    });
  }

  async getStorageClient(userId: string) {
    // Clean up expired tokens first
    await this.cleanupExpiredTokens();

    const storage = await this.storageRepository.findOne({
      where: {
        userId,
        provider: StorageProvider.GOOGLE_DRIVE
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

  async refreshAccessToken(userId: string): Promise<StorageTokens> {
    const storage = await this.storageRepository.findOne({
      where: {
        userId,
        provider: StorageProvider.GOOGLE_DRIVE
      }
    });

    if (!storage?.refreshToken) {
      // Clean up if exists but no refresh token
      if (storage) {
        await this.storageRepository.remove(storage);
      }
      throw new UnauthorizedException('No refresh token found');
    }

    if (storage.refreshTokenExpiresAt && new Date() > storage.refreshTokenExpiresAt) {
      // Remove the expired storage
      await this.storageRepository.remove(storage);
      throw new UnauthorizedException(
        'Refresh token has expired. Please reconnect your Google Drive account.'
      );
    }

    try {
      this.oauth2Client.setCredentials({
        refresh_token: storage.refreshToken
      });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      await this.saveStorage(userId, credentials);
      return credentials;
    } catch (error) {
      if (error.message.includes('invalid_grant')) {
        // Remove invalid storage
        await this.storageRepository.remove(storage);
      }
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }
}
