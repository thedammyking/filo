import { useQuery } from '@tanstack/react-query';

import { cloudProvidersQueryOptions } from '@/lib/queries/query-options/cloud-providers';

export const useCloudProviders = () => {
  return useQuery(cloudProvidersQueryOptions());
};
