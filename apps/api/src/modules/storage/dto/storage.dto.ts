import { ApiProperty } from '@nestjs/swagger';
import {
  type CheckConnectionResponse,
  type GetAuthUrlResponse,
  type SaveStorageTokensResponse
} from '@filo/interfaces';

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
