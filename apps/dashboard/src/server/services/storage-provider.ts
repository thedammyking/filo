'use server';

import type { StorageProvider } from '@filo/interfaces';

import { env } from '@/evn';

export const connectStorageProvider = async (provider: StorageProvider, token: string | null) => {
  return await fetch(`${env.API_URL}/storage/${provider}/connect`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};

export const storageAuthCallback = async (
  provider: StorageProvider,
  code: string,
  token: string | null
) => {
  console.log('storageAuthCallback', code, token);
  return await fetch(`${env.API_URL}/storage/${provider}/callback?code=${code}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};

export const checkStorageProviderConnection = async (
  provider: StorageProvider,
  token: string | null
) => {
  return await fetch(`${env.API_URL}/storage/${provider}/connection`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};

export const disconnectStorageProvider = async (
  provider: StorageProvider,
  token: string | null
) => {
  return await fetch(`${env.API_URL}/storage/${provider}/connection`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};
