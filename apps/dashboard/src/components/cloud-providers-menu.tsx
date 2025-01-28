'use client';

import React from 'react';
import type { StorageProvider } from '@filo/interfaces';
import { Button } from '@filo/ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@filo/ui/components/popover';
import Cookies from 'js-cookie';
import { uniqueId } from 'lodash';
import { ChevronDown } from 'lucide-react';

import { CLOUD_PROVIDER_COOKIE_NAME } from '@/lib/constants';
import type { CloudProvider } from '@/types/interfaces';

import { SettingsIcon } from './svgs/settings-icon';
import { ProviderButton } from './provider-button';

interface CloudProviderMenuProps {
  providers: CloudProvider[];
}

const setCloudProviderCookie = (provider: StorageProvider) => {
  Cookies.set(CLOUD_PROVIDER_COOKIE_NAME, provider);
};

const getCloudProviderCookie = () => {
  return Cookies.get(CLOUD_PROVIDER_COOKIE_NAME) as StorageProvider;
};

const CloudProviderMenu: React.FC<CloudProviderMenuProps> = ({ providers }) => {
  const [selectedCloudProvider, setSelectedCloudProvider] = React.useState<StorageProvider | null>(
    getCloudProviderCookie()
  );

  const [isOpen, setIsOpen] = React.useState(false);

  const activeCloudProvider = React.useMemo(() => {
    return providers.find(provider => provider.provider === selectedCloudProvider);
  }, [providers, selectedCloudProvider]);

  const providersListToSelect = React.useMemo(() => {
    return providers.filter(provider => provider.provider !== selectedCloudProvider);
  }, [providers, selectedCloudProvider]);

  const handleSelectCloudProvider = React.useCallback(
    (provider: StorageProvider) => () => {
      setSelectedCloudProvider(provider);
      setCloudProviderCookie(provider);
      setIsOpen(false);
    },
    []
  );

  if (!activeCloudProvider && providers.length > 0) {
    setCloudProviderCookie(providers[0].provider);
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger className='group flex min-h-[46px] min-w-[250px] items-center justify-between gap-4 rounded-full border border-border px-4 font-semibold'>
        {activeCloudProvider ? (
          <ProviderButton provider={activeCloudProvider.provider} />
        ) : (
          <span>Select a cloud provider</span>
        )}
        <ChevronDown className='size-4 transition-transform duration-200 group-data-[state=open]:rotate-180' />
      </PopoverTrigger>
      <PopoverContent
        className='overflow-hidden rounded-xl border-border p-0 outline-none'
        align='end'
      >
        {providersListToSelect.map(provider => (
          <Button
            key={uniqueId('cloud-provider-')}
            onClick={handleSelectCloudProvider(provider.provider)}
            tabIndex={0}
            variant='ghost'
            className='text-md h-max min-h-10 w-full justify-start gap-[24px] rounded-none border-b border-border px-[30px] py-4 font-medium text-accent-foreground/75 last:border-b-0 hover:bg-accent/50 hover:text-accent-foreground/75'
          >
            <ProviderButton provider={provider.provider} />
          </Button>
        ))}
        <Button
          tabIndex={0}
          variant='ghost'
          className='text-md h-max min-h-10 w-full justify-start gap-[24px] rounded-none border-b border-border px-[30px] py-4 font-medium text-accent-foreground/75 last:border-b-0 hover:bg-accent/50 hover:text-accent-foreground/75'
        >
          <SettingsIcon className='size-4' />
          Manage storages
        </Button>
      </PopoverContent>
    </Popover>
  );
};

export default CloudProviderMenu;
