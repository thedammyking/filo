import { ApiProperty } from '@nestjs/swagger';
import {
  type CheckConnectionResponse,
  type GetAuthUrlResponse,
  type SaveStorageTokensResponse,
  type StorageProvider
} from '@filo/interfaces';
import type { Upload } from '@/modules/uploads/entities/upload.entity';
import type { Storage } from '../entities/storage.entity';

export class AuthUrlResponse implements GetAuthUrlResponse {
  @ApiProperty({
    example: 'https://accounts.google.com/o/oauth2/auth?...',
    description: 'The OAuth authorization URL'
  })
  url: string;
}

export class StorageTokenResponse implements SaveStorageTokensResponse {
  @ApiProperty({
    example: true,
    description: 'Whether the operation was successful'
  })
  success: boolean;
}

export class ConnectionStatusResponse implements CheckConnectionResponse {
  @ApiProperty({
    example: true,
    description: 'Whether the user is connected to the storage provider'
  })
  connected: boolean;
}

export class StorageResponse implements Storage {
  @ApiProperty({
    example: 'google-drive',
    description: 'The storage provider'
  })
  provider: StorageProvider;

  @ApiProperty({
    example: '1234567890',
    description: 'The storage ID'
  })
  id: string;

  @ApiProperty({
    example: '1234567890',
    description: 'The user ID'
  })
  userId: string;

  @ApiProperty({
    example: '1234567890',
    description: 'The storage access token'
  })
  accessToken: string;

  @ApiProperty({
    example: '1234567890',
    description: 'The storage refresh token'
  })
  refreshToken: string;

  @ApiProperty({
    example: '1234567890',
    description: 'The storage expiry date'
  })
  expiryDate: number;

  @ApiProperty({
    example: '2025-01-01T00:00:00Z',
    description: 'The storage refresh token expiry date'
  })
  refreshTokenExpiresAt: Date;

  @ApiProperty({
    example: '2025-01-01T00:00:00Z',
    description: 'The storage last updated date'
  })
  lastUpdated: Date;

  @ApiProperty({
    example: '1234567890',
    description: 'The storage uploads'
  })
  uploads: Upload[];

  @ApiProperty({
    example: '2025-01-01T00:00:00Z',
    description: 'The storage created date'
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-01-01T00:00:00Z',
    description: 'The storage updated date'
  })
  updatedAt: Date;
}
