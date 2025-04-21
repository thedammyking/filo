import { queryOptions } from '@tanstack/react-query';

import { getActiveCloudProvider, getCloudProviders } from '@/server/actions/storage-provider';

import { cloudProviderKeys } from '../query-keys/cloud-providers';

export const cloudProvidersQueryOptions = () =>
  queryOptions({
    queryKey: cloudProviderKeys.cloudProvider(),
    queryFn: async () => {
      const [data, error] = await getCloudProviders();
      if (error) throw error;
      return data;
    }
  });

export const activeCloudProviderQueryOptions = () =>
  queryOptions({
    queryKey: cloudProviderKeys.activeCloudProvider(),
    queryFn: async () => {
      const [data, error] = await getActiveCloudProvider();
      if (error) throw error;
      console.log('activeCloudProviderQueryOptions', data);
      return data;
    }
  });
