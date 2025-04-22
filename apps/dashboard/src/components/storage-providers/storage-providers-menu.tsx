'use client';

import React from 'react';
import type { StorageProvider } from '@filo/interfaces';
import { Button } from '@filo/ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@filo/ui/components/popover';
import { uniqueId } from 'lodash';
import { ChevronDown, Loader } from 'lucide-react';

import { useActiveCloudProvider } from '@/hooks/use-active-cloud-provider';
import { useCloudProviders } from '@/hooks/use-cloud-providers';
import { useSetActiveCloudProvider } from '@/hooks/use-set-active-cloud-provider';

import { ManageStorageDialog } from '../manage-storage-dialog';
import { ProviderDisplay } from '../provider-display';
import { SettingsIcon } from '../svgs/settings-icon';

const StorageProviderMenu: React.FC = () => {
  const { data: providers } = useCloudProviders();
  const { mutateAsync: setActiveCloudProvider, isPending: isSettingActiveCloudProvider } =
    useSetActiveCloudProvider();

  const activeCloudProvider = useActiveCloudProvider(provider => {
    setActiveCloudProvider(provider.provider);
  });

  const [isOpen, setIsOpen] = React.useState(false);

  const [isManageStorageDialogOpen, setIsManageStorageDialogOpen] = React.useState(false);

  const handleOpenManageStorageDialog = React.useCallback(() => {
    setIsManageStorageDialogOpen(true);
    setIsOpen(false);
  }, []);

  const providersListToSelect = React.useMemo(() => {
    return providers?.filter(provider => provider.provider !== activeCloudProvider?.provider);
  }, [providers, activeCloudProvider]);

  const handleSelectCloudProvider = React.useCallback(
    (provider: StorageProvider) => async () => {
      await setActiveCloudProvider(provider, {
        onSuccess: () => {
          setIsOpen(false);
        }
      });
    },
    [setActiveCloudProvider]
  );

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger className='group flex min-h-[46px] min-w-max items-center justify-between gap-4 rounded-full border border-border px-4 font-semibold sm:min-w-[200px]'>
          {activeCloudProvider ? (
            <ProviderDisplay provider={activeCloudProvider.provider} isActive />
          ) : (
            <span>Select storage provider</span>
          )}
          <ChevronDown className='size-4 transition-transform duration-200 group-data-[state=open]:rotate-180' />
        </PopoverTrigger>
        <PopoverContent
          className='max-w-[300px] overflow-hidden rounded-xl border-border p-0 outline-none'
          align='end'
          sideOffset={2}
        >
          {providersListToSelect?.map(provider => (
            <Button
              key={uniqueId('cloud-provider-')}
              onClick={handleSelectCloudProvider(provider.provider)}
              tabIndex={0}
              variant='ghost'
              className='text-md h-max min-h-10 w-full justify-start gap-4 rounded-none border-b border-border px-[30px] py-4 font-medium text-accent-foreground/75 last:border-b-0 hover:bg-accent/50 hover:text-accent-foreground/75'
            >
              <ProviderDisplay provider={provider.provider} />{' '}
              <Loader
                className='size-4 animate-spin data-[hidden=true]:hidden'
                data-hidden={!isSettingActiveCloudProvider}
              />
            </Button>
          ))}
          <Button
            tabIndex={0}
            onClick={handleOpenManageStorageDialog}
            variant='ghost'
            className='text-md h-max min-h-10 w-full justify-start gap-6 rounded-none border-b border-border px-[30px] py-4 font-medium text-accent-foreground/75 last:border-b-0 hover:bg-accent/50 hover:text-accent-foreground/75'
          >
            <SettingsIcon className='size-4' />
            Manage storages
          </Button>
        </PopoverContent>
      </Popover>
      <ManageStorageDialog
        open={isManageStorageDialogOpen}
        onOpenChange={setIsManageStorageDialogOpen}
      />
    </>
  );
};

export default StorageProviderMenu;
