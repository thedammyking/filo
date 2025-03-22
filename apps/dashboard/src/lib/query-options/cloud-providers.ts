import { queryOptions } from '@tanstack/react-query';

import { getCloudProviders } from '@/server/actions/storage-provider';

export const cloudProvidersQueryOptions = () =>
  queryOptions({
    queryKey: ['cloud-providers'],
    queryFn: async () => {
      const [data, error] = await getCloudProviders();
      if (error) throw error;
      return data;
    }
  });
