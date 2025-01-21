import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { google } from 'googleapis';
import { Repository } from 'typeorm';

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

  getAuthUrl(userId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ];

    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state
    });
  }

  async getTokens(code: string, userId: string): Promise<StorageTokens> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      await this.saveStorage(userId, tokens);
      return tokens;
    } catch (error) {
      console.log(error);
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

    if (storage) {
      Object.assign(storage, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date
      });
    } else {
      storage = this.storageRepository.create({
        userId,
        provider: StorageProvider.GOOGLE_DRIVE,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date
      });
    }
    await this.storageRepository.save(storage);
  }

  async refreshAccessToken(userId: string): Promise<StorageTokens> {
    const storage = await this.storageRepository.findOne({
      where: {
        userId,
        provider: StorageProvider.GOOGLE_DRIVE
      }
    });

    if (!storage?.refreshToken) {
      throw new UnauthorizedException('No refresh token found');
    }

    try {
      this.oauth2Client.setCredentials({
        refresh_token: storage.refreshToken
      });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      await this.saveStorage(userId, credentials);
      return credentials;
    } catch (error) {
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  async getStorageClient(userId: string) {
    const storage = await this.storageRepository.findOne({
      where: {
        userId,
        provider: StorageProvider.GOOGLE_DRIVE
      }
    });

    if (!storage) {
      throw new UnauthorizedException('No tokens found for this user');
    }

    const tokens = {
      access_token: storage.accessToken,
      refresh_token: storage.refreshToken,
      expiry_date: storage.expiryDate
    };

    if (tokens.expiry_date && Date.now() > tokens.expiry_date) {
      const newTokens = await this.refreshAccessToken(userId);
      tokens.access_token = newTokens.access_token;
      tokens.expiry_date = newTokens.expiry_date;
    }

    this.oauth2Client.setCredentials(tokens);
    return google.drive({ version: 'v3', auth: this.oauth2Client });
  }
}
