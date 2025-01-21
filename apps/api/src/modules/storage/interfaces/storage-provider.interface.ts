export interface StorageTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

export interface IStorageProvider {
  getAuthUrl(userId: string): string | Promise<string>;
  getTokens(code: string, userId: string): Promise<StorageTokens>;
  refreshAccessToken(userId: string): Promise<StorageTokens>;
  getStorageClient(userId: string): Promise<any>;
}
