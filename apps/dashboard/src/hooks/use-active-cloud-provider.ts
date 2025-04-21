import React from 'react';
import { useQuery } from '@tanstack/react-query';

import type { CloudProvider } from '@/types/interfaces';

import { activeCloudProviderQueryOptions } from '../queries/query-options/cloud-providers';

export const useActiveCloudProvider = (
  providers: CloudProvider[] = [],
  setActiveProvider: (provider: CloudProvider) => void
) => {
  const { data: activeProvider } = useQuery(activeCloudProviderQueryOptions());
  const provider = providers.find(provider => provider.provider === activeProvider);

  const handleSetActiveProvider = React.useCallback(() => {
    if (!provider && providers.length > 0) {
      setActiveProvider(providers[0]);
    }
  }, [setActiveProvider, providers, provider]);

  React.useEffect(() => {
    handleSetActiveProvider();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers, provider]);

  return provider;
};
