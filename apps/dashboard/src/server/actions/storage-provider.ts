'use server';

import { cache } from 'react';

import type { CloudProvider } from '@/types/interfaces';

import { authenticatedProcedure } from '../procedures/auth';
import * as storageProviderService from '../services/storage-provider';

export const getCloudProviders = cache(
  authenticatedProcedure.createServerAction().handler(async ({ ctx }): Promise<CloudProvider[]> => {
    const { token } = ctx;
    try {
      const response = await storageProviderService.getCloudProviders(token);
      const { data } = await response.json();

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'There was an error getting the cloud providers.');
    }
  })
);
