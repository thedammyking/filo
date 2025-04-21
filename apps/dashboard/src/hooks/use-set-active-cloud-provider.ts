import type { StorageProvider } from '@filo/interfaces';
import { useMutation } from '@tanstack/react-query';

import { setActiveCloudProvider } from '@/server/actions/storage-provider';

import queryClient from '../lib/query-client';
import { cloudProviderKeys } from '../queries/query-keys/cloud-providers';

export const useSetActiveCloudProvider = () => {
  return useMutation({
    mutationFn: async (provider: StorageProvider) => {
      const [data, error] = await setActiveCloudProvider({ provider });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cloudProviderKeys.activeCloudProvider() });
    }
  });
};
