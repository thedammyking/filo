'use server';

import type {
  CheckConnectionResponse,
  GetAuthUrlResponse,
  RemoveConnectionResponse,
  SaveStorageTokensResponse
} from '@filo/interfaces';
import { STORAGE_PROVIDER } from '@filo/libs/constants';
import { z } from 'zod';

import { authenticatedProcedure } from '../procedures/auth';
import {
  checkStorageProviderConnection,
  connectStorageProvider,
  disconnectStorageProvider,
  storageAuthCallback
} from '../services/storage-provider';

export const getGoogleDriveAuthUrl = authenticatedProcedure
  .createServerAction()
  .handler(async ({ ctx }): Promise<GetAuthUrlResponse> => {
    const { token } = ctx;
    try {
      const { data } = await connectStorageProvider(STORAGE_PROVIDER.GOOGLE_DRIVE, token);
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get auth URL');
    }
  });

export const googleDriveAuthCallback = authenticatedProcedure
  .createServerAction()
  .input(z.object({ code: z.string() }))
  .handler(async ({ ctx, input }): Promise<SaveStorageTokensResponse> => {
    const { token } = ctx;
    const { code } = input;

    try {
      const { data } = await storageAuthCallback(STORAGE_PROVIDER.GOOGLE_DRIVE, code, token);
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get auth URL');
    }
  });

export const checkGoogleDriveConnection = authenticatedProcedure
  .createServerAction()
  .handler(async ({ ctx }): Promise<CheckConnectionResponse> => {
    const { token } = ctx;
    try {
      const { data } = await checkStorageProviderConnection(STORAGE_PROVIDER.GOOGLE_DRIVE, token);
      return data as { connected: boolean };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to check Google Drive connection');
    }
  });

export const disconnectGoogleDrive = authenticatedProcedure
  .createServerAction()
  .handler(async ({ ctx }): Promise<RemoveConnectionResponse> => {
    const { token } = ctx;
    try {
      const { data } = await disconnectStorageProvider(STORAGE_PROVIDER.GOOGLE_DRIVE, token);
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to disconnect from Google Drive');
    }
  });
