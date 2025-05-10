import type { ClerkClient } from '@clerk/backend';
import type {
  AVAILABILITY_STATUS,
  STORAGE_PROVIDER,
  UPLOAD_STATUS,
  UPLOAD_TYPE
} from '@filo/libs/constants';
import type { google } from 'googleapis';
import type { Readable } from 'stream';

export type { User } from '@clerk/backend';

export type UserListParams = Parameters<ClerkClient['users']['getUserList']>[0];

export type UpdateUserParams = Parameters<ClerkClient['users']['updateUser']>[1];

export type CreateUserParams = Parameters<ClerkClient['users']['createUser']>[0];

export interface ServerResponse<T> {
  status: boolean;
  statusCode: number;
  path: string;
  message?: string;
  data: T;
  timestamp: string;
  stack?: string;
}

export interface StorageTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

export interface GetAuthUrlResponse {
  url: string;
}

export interface SaveStorageTokensResponse {
  success: boolean;
}

export type StorageClient = ReturnType<typeof google.drive>;

export interface CheckConnectionResponse {
  connected: boolean;
}

export interface RemoveConnectionResponse {
  success: boolean;
}

export interface Storage {
  id: string;
  userId: string;
  provider: StorageProvider;
  accessToken?: string;
  refreshToken?: string;
  expiryDate?: number;
  config?: {
    folderId?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadStreamProviderOptions {
  stream: Readable | NodeJS.ReadableStream;
  filename: string; // Relative path within the subdirectory for the provider to use
  mimetype?: string;
  storageDetails: Storage; // Assuming Storage here is your Storage entity interface
  subdirectory?: string; // For grouping files, e.g., in a torrent
  fileSize?: number; // Total size of the file being streamed
}

export interface IStorageProvider {
  getAuthUrl(): GetAuthUrlResponse | Promise<GetAuthUrlResponse>;
  saveStorageTokens(code: string, userId: string): Promise<SaveStorageTokensResponse>;
  refreshAccessToken(userId: string): Promise<StorageTokens>;
  getStorageClient(userId: string): Promise<StorageClient>;
  removeConnection(userId: string): Promise<RemoveConnectionResponse>;
  checkConnection(userId: string): Promise<CheckConnectionResponse>;

  /**
   * Uploads a file stream to the storage provider.
   * @param options - Options including the stream, filename, mimetype, and storage entity details.
   * @returns Provider-specific result (e.g., file ID, URL).
   */
  uploadStream(options: UploadStreamProviderOptions): Promise<any>;
}

export interface WithData<T> {
  data: T;
}

export type StorageProvider = (typeof STORAGE_PROVIDER)[keyof typeof STORAGE_PROVIDER];

export type UploadStatus = (typeof UPLOAD_STATUS)[keyof typeof UPLOAD_STATUS];

export type UploadType = (typeof UPLOAD_TYPE)[keyof typeof UPLOAD_TYPE];

export type AvailabilityStatus = (typeof AVAILABILITY_STATUS)[keyof typeof AVAILABILITY_STATUS];

export type StorageProviderDetails = {
  name: string;
  value: StorageProvider;
  status: AvailabilityStatus;
};

export interface Link {
  link: string;
  type: UploadType;
}

export interface CreateUploadDto {
  storageId: string;
  links: Link[];
}

export interface UpdateUploadDto {
  status?: UploadStatus;
  progress?: number;
  fileName?: string;
}

export interface UploadResponse {
  id: string;
  link: string;
  fileName: string;
  type: UploadType;
  status: UploadStatus;
  progress: number;
  storage: Storage;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    pagination: {
      total: number;
      page: number;
      limit: number;
    };
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface UploadFilterParams extends PaginationParams {
  status?: UploadStatus;
  storageId?: string;
}
