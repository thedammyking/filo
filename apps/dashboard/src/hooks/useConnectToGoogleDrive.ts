'use client';

import { useState } from 'react';

import { getGoogleDriveAuthUrl, googleDriveAuthCallback } from '@/server/actions/google-drive';

interface AuthResponse {
  code: string;
}

export const useConnectToGoogleDrive = (onSuccess?: () => Promise<void>) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAuthWindow = async (): Promise<AuthResponse> => {
    // eslint-disable-next-line no-async-promise-executor
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
              code: event.data.code
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
      await onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    handleConnect
  };
};
