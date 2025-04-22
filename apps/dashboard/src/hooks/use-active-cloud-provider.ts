import React from 'react';
import { useQuery } from '@tanstack/react-query';

import queryClient from '@/lib/query-client';
import { cloudProviderKeys } from '@/queries/query-keys/cloud-providers';
import type { CloudProvider } from '@/types/interfaces';

import { activeCloudProviderQueryOptions } from '../queries/query-options/cloud-providers';

export const useActiveCloudProvider = (setActiveProvider?: (provider: CloudProvider) => void) => {
  const cloudProviders = queryClient.getQueryData<CloudProvider[]>(
    cloudProviderKeys.cloudProvider()
  );
  const { data: activeProvider } = useQuery(activeCloudProviderQueryOptions());
  const provider = cloudProviders?.find(provider => provider.provider === activeProvider);

  const handleSetActiveProvider = React.useCallback(() => {
    if (!provider && cloudProviders?.length) {
      setActiveProvider?.(cloudProviders[0]);
    }
  }, [setActiveProvider, cloudProviders, provider]);

  React.useEffect(() => {
    handleSetActiveProvider();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudProviders, provider]);

  return provider;
};
