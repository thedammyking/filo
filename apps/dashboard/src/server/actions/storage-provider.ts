'use server';

import { cache } from 'react';
import type { StorageProvider } from '@filo/interfaces';
import { STORAGE_PROVIDER } from '@filo/libs/constants';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { CLOUD_PROVIDER_COOKIE_NAME, CLOUD_PROVIDER_COOKIE_OPTIONS } from '@/lib/constants';
import type { CloudProvider } from '@/types/interfaces';

import { authenticatedProcedure } from '../procedures/auth';
import * as storageProviderService from '../services/storage-provider';

export const getCloudProviders = cache(
  authenticatedProcedure.createServerAction().handler(async ({ ctx }): Promise<CloudProvider[]> => {
    const { token } = ctx;
    try {
      const { data } = await storageProviderService.getCloudProviders(token);

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'There was an error getting the cloud providers.');
    }
  })
);

export const getActiveCloudProvider = cache(
  authenticatedProcedure.createServerAction().handler(async ({ ctx }) => {
    const cookieStore = await cookies();

    const activeCloudProvider = cookieStore.get(`${CLOUD_PROVIDER_COOKIE_NAME}-${ctx.userId}`)
      ?.value as unknown as StorageProvider;
    return activeCloudProvider ?? null;
  })
);

export const setActiveCloudProvider = cache(
  authenticatedProcedure
    .createServerAction()
    .input(z.object({ provider: z.nativeEnum(STORAGE_PROVIDER) }))
    .handler(async ({ input, ctx }) => {
      const cookieStore = await cookies();
      cookieStore.set(
        `${CLOUD_PROVIDER_COOKIE_NAME}-${ctx.userId}`,
        input.provider,
        CLOUD_PROVIDER_COOKIE_OPTIONS
      );
      return true;
    })
);
