export interface StorageTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

export interface IStorageProvider {
  getAuthUrl(): string | Promise<string>;
  getTokens(code: string, userId: string): Promise<StorageTokens>;
  refreshAccessToken(userId: string): Promise<StorageTokens>;
  getClient(userId: string): Promise<any>;
}
