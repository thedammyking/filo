import { queryOptions } from '@tanstack/react-query';

import { getCloudProviders } from '@/server/actions/storage-provider';

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
