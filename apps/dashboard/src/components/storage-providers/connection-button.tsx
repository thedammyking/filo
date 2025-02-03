'use client';

import React from 'react';
import type { StorageProvider, StorageProviderDetails } from '@filo/interfaces';
import { AVAILABILITY_STATUS, STORAGE_PROVIDER_DETAILS } from '@filo/libs/constants';
import { Button } from '@filo/ui/components/button';
import { Loader } from 'lucide-react';

import { useConnectToGoogleDrive } from '@/hooks/use-connect-to-google-drive';

import { useStorageProvidersContext } from './context-provider';

const ConnectButton = () => {
  const { selected } = useStorageProvidersContext();

  const availableProviders = Object.keys(STORAGE_PROVIDER_DETAILS).reduce(
    (acc, provider) => {
      if (
        STORAGE_PROVIDER_DETAILS[provider as StorageProvider].status ===
        AVAILABILITY_STATUS.AVAILABLE
      ) {
        acc = {
          ...acc,
          [provider]: STORAGE_PROVIDER_DETAILS[provider as StorageProvider]
        };
      }
      return acc;
    },
    {} as Record<StorageProvider, StorageProviderDetails>
  );

  const isAvailable = React.useMemo(() => {
    return selected && selected in availableProviders;
  }, [selected, availableProviders]);

  const {
    handleConnect,
    error,
    setError,
    isLoading,
    isConnected,
    handleDisconnect,
    handleCheckConnection
  } = useConnectToGoogleDrive();

  const handleConnection = async () => {
    if (isConnected) {
      if (Object.keys(availableProviders).length === 1)
        setError('Cannot disconnect the default provider');
      else await handleDisconnect();
    } else {
      await handleConnect();
    }
  };

  const { label, disabled } = React.useMemo(() => {
    if (isAvailable)
      return {
        label: `${isConnected ? 'Disconnect from' : 'Connect to'} ${selected ? availableProviders[selected].name : ''}`,
        disabled: false
      };

    return {
      label: 'Unavailable',
      disabled: true
    };
  }, [isAvailable, isConnected, availableProviders, selected]);

  const checkConnectionHandler = React.useCallback(async () => {
    if (isAvailable) {
      await handleCheckConnection();
    }
  }, [isAvailable, handleCheckConnection]);

  React.useEffect(() => {
    checkConnectionHandler();
  }, [isAvailable, checkConnectionHandler]);

  if (!selected) return null;

  return (
    <div className='mt-[30px] flex flex-col items-center justify-center gap-2'>
      <Button
        type='button'
        className='min-w-[200px]'
        onClick={handleConnection}
        disabled={disabled}
      >
        {isLoading && isAvailable ? <Loader className='size-4 animate-spin' /> : label}
      </Button>
      {error && <p className='mt-2 text-red-500'>{error}</p>}
    </div>
  );
};

export default ConnectButton;
