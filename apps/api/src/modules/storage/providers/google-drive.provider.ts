import {
  Injectable,
  UnauthorizedException,
  Logger,
  InternalServerErrorException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { google, drive_v3 } from 'googleapis';
import { Repository, LessThan } from 'typeorm';
import { addDays } from 'date-fns';
import type { Readable } from 'stream';

import { APP_FOLDER_NAME, STORAGE_PROVIDER } from '@filo/libs/constants';

import { Storage } from '../entities/storage.entity';
import { IStorageProvider, Storage as StorageInterface } from '@filo/interfaces';
import { GoogleDriveException } from '../exceptions/google-drive.exception';
import type {
  GetAuthUrlResponse,
  RemoveConnectionResponse,
  SaveStorageTokensResponse,
  StorageClient,
  StorageTokens
} from '@filo/interfaces';

interface GoogleDriveUploadStreamOptions {
  stream: Readable;
  filename: string;
  mimetype?: string;
  storageDetails: StorageInterface;
  subdirectory?: string;
}
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

  private async ensureValidCredentials(storage: StorageInterface): Promise<void> {
    const tokens = {
      access_token: storage.accessToken,
      refresh_token: storage.refreshToken,
      expiry_date: storage.expiryDate
    };

    if (!tokens.access_token) {
      throw new UnauthorizedException('Missing access token.');
    }

    if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
      this.logger.log(`Access token expired for user ${storage.userId}, attempting refresh.`);
      if (!tokens.refresh_token) {
        await this.handleInvalidGrant(storage.userId);
        throw new UnauthorizedException(
          'Access token expired and no refresh token available. Please reconnect account.'
        );
      }
      try {
        this.oauth2Client.setCredentials({ refresh_token: tokens.refresh_token });
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        await this.saveStorage(storage.userId, credentials);
        tokens.access_token = credentials.access_token;
        tokens.expiry_date = credentials.expiry_date;
        this.logger.log(`Access token refreshed successfully for user ${storage.userId}.`);
      } catch (error) {
        this.logger.error(
          `Failed to refresh access token for user ${storage.userId}: ${error.message}`,
          error.stack
        );
        if (
          error.response?.data?.error === 'invalid_grant' ||
          error.message.includes('invalid_grant')
        ) {
          await this.handleInvalidGrant(storage.userId);
          throw new UnauthorizedException(
            'Could not refresh access token (invalid grant). Please reconnect account.'
          );
        }
        throw new InternalServerErrorException('Failed to refresh access token.');
      }
    }

    this.oauth2Client.setCredentials(tokens);
  }

  async getStorageClient(userId: string): Promise<StorageClient> {
    await this.cleanupExpiredTokens();
    const storage = await this.storageRepository.findOne({
      where: { userId, provider: STORAGE_PROVIDER.GOOGLE_DRIVE }
    });

    if (!storage) {
      throw new UnauthorizedException('No Google Drive connection found for this user.');
    }

    await this.ensureValidCredentials(storage);

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

  private async revokeToken(token: string, userId: string): Promise<void> {
    if (!token) return;

    try {
      await this.oauth2Client.revokeToken(token);
      await this.storageRepository.delete({
        userId,
        provider: STORAGE_PROVIDER.GOOGLE_DRIVE
      });
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

    await Promise.all([
      this.revokeToken(storage.accessToken, userId),
      this.revokeToken(storage.refreshToken, userId)
    ]);

    await this.storageRepository.remove(storage);
    return { success: true };
  }

  async checkConnection(userId: string) {
    try {
      const drive = await this.getStorageClient(userId);
      await drive.files.list({ pageSize: 1, fields: 'files(id)' });
      return { connected: true };
    } catch (error) {
      this.logger.warn(`Google Drive connection check failed for user ${userId}: ${error.message}`);
      if (error instanceof UnauthorizedException || error instanceof GoogleDriveException) {
        return { connected: false };
      }
      throw error;
    }
  }

  /**
   * Finds or creates the application-specific folder in Google Drive.
   * @param drive - Authenticated Google Drive API client.
   * @returns The ID of the application folder.
   */
  private async _findOrCreateAppFolder(drive: drive_v3.Drive): Promise<string> {
    const folderName = APP_FOLDER_NAME;
    this.logger.debug(`Searching for app folder: ${folderName}`);
    try {
      // Search for the folder in the root, not trashed
      const listResponse = await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive'
      });

      if (listResponse.data.files && listResponse.data.files.length > 0) {
        const folderId = listResponse.data.files[0].id;
        this.logger.debug(`Found existing app folder with ID: ${folderId}`);
        return folderId;
      }

      // Folder not found, create it
      this.logger.log(`App folder '${folderName}' not found, creating...`);
      const folderMetadata: drive_v3.Schema$File = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };
      const createResponse = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id'
      });
      const newFolderId = createResponse.data.id;
      this.logger.log(`Created app folder '${folderName}' with ID: ${newFolderId}`);
      return newFolderId;
    } catch (error) {
      this.logger.error(
        `Failed to find or create app folder '${folderName}': ${error.message}`,
        error.stack
      );
      // Rethrow a specific exception or a generic one depending on desired handling
      throw new InternalServerErrorException(
        `Could not find or create the '${folderName}' folder in Google Drive.`
      );
    }
  }

  /**
   * Uploads a file stream to Google Drive.
   */
  async uploadStream(options: GoogleDriveUploadStreamOptions): Promise<drive_v3.Schema$File> {
    const { stream, filename, mimetype, storageDetails, subdirectory } = options;
    const { userId } = storageDetails;

    this.logger.log(`Starting stream upload for user ${userId}, filename: ${filename}`);

    try {
      // 1. Ensure credentials are valid and set on oauth2Client
      await this.ensureValidCredentials(storageDetails);

      // 2. Get authenticated drive client
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      // 3. Find or create the app folder
      const appFolderId = await this._findOrCreateAppFolder(drive);

      // 4. If subdirectory is provided, find or create it
      let parentFolderId = appFolderId;
      if (subdirectory) {
        parentFolderId = await this._findOrCreateSubfolder(drive, appFolderId, subdirectory);
      }

      // 5. Perform the upload into the specific folder
      const fileMetadata: drive_v3.Schema$File = {
        name: filename,
        parents: [parentFolderId] // Use the subfolder ID if it exists
      };

      const media = {
        mimeType: mimetype,
        body: stream
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink, mimeType, size'
      });

      this.logger.log(
        `Successfully uploaded file ${response.data.id} (${filename}) into folder ${parentFolderId} for user ${userId}`
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Google Drive stream upload failed for user ${userId}, filename ${filename}: ${error.message}`,
        error.stack
      );
      if (error.response?.data?.error) {
        const googleError = error.response.data.error;
        throw new GoogleDriveException(
          `Google API Error: ${googleError.message} (Code: ${googleError.code})`,
          googleError.code
        );
      }
      if (
        error instanceof UnauthorizedException ||
        error instanceof GoogleDriveException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to upload file to Google Drive.');
    }
  }

  /**
   * Finds or creates a subfolder within a parent folder in Google Drive.
   * @param drive - Authenticated Google Drive API client.
   * @param parentFolderId - ID of the parent folder.
   * @param subfolderName - Name of the subfolder to find or create.
   * @returns The ID of the subfolder.
   */
  private async _findOrCreateSubfolder(
    drive: drive_v3.Drive,
    parentFolderId: string,
    subfolderName: string
  ): Promise<string> {
    this.logger.debug(`Searching for subfolder: ${subfolderName} in parent: ${parentFolderId}`);
    try {
      // Search for the subfolder in the parent folder
      const listResponse = await drive.files.list({
        q: `name='${subfolderName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive'
      });

      if (listResponse.data.files && listResponse.data.files.length > 0) {
        const folderId = listResponse.data.files[0].id;
        this.logger.debug(`Found existing subfolder with ID: ${folderId}`);
        return folderId;
      }

      // Subfolder not found, create it
      this.logger.log(`Subfolder '${subfolderName}' not found, creating...`);
      const folderMetadata: drive_v3.Schema$File = {
        name: subfolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId]
      };
      const createResponse = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id'
      });
      const newFolderId = createResponse.data.id;
      this.logger.log(`Created subfolder '${subfolderName}' with ID: ${newFolderId}`);
      return newFolderId;
    } catch (error) {
      this.logger.error(
        `Failed to find or create subfolder '${subfolderName}': ${error.message}`,
        error.stack
      );
      throw new InternalServerErrorException(
        `Could not find or create the '${subfolderName}' subfolder in Google Drive.`
      );
    }
  }
}
