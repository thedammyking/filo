'use server';

import type { CloudProvider } from '@/types/interfaces';

import { authedProcedure } from '../procedures/auth';
import * as storageProviderService from '../services/storage-provider';

export const getCloudProviders = authedProcedure
  .createServerAction()
  .handler(async ({ ctx }): Promise<CloudProvider[]> => {
    const { token } = ctx;
    try {
      const response = await storageProviderService.getCloudProviders(token);
      const { data } = await response.json();

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'There was an error getting the cloud providers.');
    }
  });
