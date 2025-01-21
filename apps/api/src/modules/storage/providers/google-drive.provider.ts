import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { google } from 'googleapis';
import { Repository } from 'typeorm';

import { StorageProvider } from '../constants/storage-provider.enum';
import { StorageToken } from '../entities/storage-token.entity';
import { IStorageProvider, StorageTokens } from '../interfaces/storage-provider.interface';

@Injectable()
export class GoogleDriveProvider implements IStorageProvider {
  private oauth2Client;

  constructor(
    private configService: ConfigService,
    @InjectRepository(StorageToken)
    private tokenRepository: Repository<StorageToken>
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
      prompt: 'consent'
    });
  }

  async getTokens(code: string, userId: string): Promise<StorageTokens> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      await this.saveTokens(userId, tokens);
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Failed to get Google tokens');
    }
  }

  private async saveTokens(userId: string, tokens: StorageTokens) {
    const existingToken = await this.tokenRepository.findOne({
      where: {
        userId,
        provider: StorageProvider.GOOGLE_DRIVE
      }
    });

    if (existingToken) {
      await this.tokenRepository.update(existingToken.id, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date
      });
    } else {
      const newToken = this.tokenRepository.create({
        userId,
        provider: StorageProvider.GOOGLE_DRIVE,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date
      });
      await this.tokenRepository.save(newToken);
    }
  }

  async refreshAccessToken(userId: string): Promise<StorageTokens> {
    const storedToken = await this.tokenRepository.findOne({
      where: {
        userId,
        provider: StorageProvider.GOOGLE_DRIVE
      }
    });

    if (!storedToken?.refreshToken) {
      throw new UnauthorizedException('No refresh token found');
    }

    try {
      this.oauth2Client.setCredentials({
        refresh_token: storedToken.refreshToken
      });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      await this.saveTokens(userId, credentials);
      return credentials;
    } catch (error) {
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  async getClient(userId: string) {
    const storedToken = await this.tokenRepository.findOne({
      where: {
        userId,
        provider: StorageProvider.GOOGLE_DRIVE
      }
    });

    if (!storedToken) {
      throw new UnauthorizedException('No tokens found for this user');
    }

    const tokens = {
      access_token: storedToken.accessToken,
      refresh_token: storedToken.refreshToken,
      expiry_date: storedToken.expiryDate
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
