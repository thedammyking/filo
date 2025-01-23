'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@filo/ui/components/button';
import { Loader } from 'lucide-react';

import {
  checkGoogleDriveConnection,
  disconnectGoogleDrive,
  getGoogleDriveAuthUrl,
  googleDriveAuthCallback
} from '@/server/actions/google-drive';

interface AuthResponse {
  code: string;
  state: string;
}

export function GoogleDriveConnect() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const handleDisconnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await disconnectGoogleDrive();
      handleCheckConnection();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckConnection = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, error] = await checkGoogleDriveConnection();

      if (error) {
        setError(error.message);
      }
      setIsConnected(!!data?.connected);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openAuthWindow = async (): Promise<AuthResponse> => {
    return new Promise(async (resolve, reject) => {
      try {
        const [data, error] = await getGoogleDriveAuthUrl();

        if (error || !data) {
          throw new Error(error?.message || 'Failed to get auth URL');
        }

        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          data.url,
          'Google Sign In',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
          throw new Error('Popup was blocked by the browser');
        }

        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'oauth-complete') {
            window.removeEventListener('message', messageHandler);
            resolve({
              code: event.data.code,
              state: event.data.state
            });
          } else if (event.data.type === 'oauth-error') {
            window.removeEventListener('message', messageHandler);
            reject(new Error(event.data.error));
          }
        };

        window.addEventListener('message', messageHandler);

        const popupCheck = setInterval(() => {
          if (popup.closed) {
            clearInterval(popupCheck);
            window.removeEventListener('message', messageHandler);
            reject(new Error('Authentication cancelled'));
          }
        }, 1000);
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { code } = await openAuthWindow();
      const [_, error] = await googleDriveAuthCallback({ code });

      if (error) {
        setError(error.message);
      }

      await handleCheckConnection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleCheckConnection();
  }, [handleCheckConnection]);

  return (
    <div className='flex flex-col items-center justify-center gap-2'>
      <Button
        className='flex min-w-[150px] items-center justify-center'
        size='sm'
        onClick={isConnected ? handleDisconnect : handleConnect}
      >
        {isLoading ? (
          <Loader className='size-4 animate-spin' />
        ) : isConnected ? (
          'Disconnect Google Drive'
        ) : (
          'Connect Google Drive'
        )}
      </Button>
      {error && <p className='mt-2 text-red-500'>{error}</p>}
    </div>
  );
}
