'use server';

import type { StorageProvider } from '@filo/interfaces';

import { env } from '@/evn';

export const connectStorageProvider = async (provider: StorageProvider, token: string | null) => {
  const response = await fetch(`${env.API_URL}/storage/${provider}/connect`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to connect storage provider');
  }

  return await response.json();
};

export const storageAuthCallback = async (
  provider: StorageProvider,
  code: string,
  token: string | null
) => {
  const response = await fetch(`${env.API_URL}/storage/${provider}/callback?code=${code}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to authenticate storage provider');
  }

  return await response.json();
};

export const checkStorageProviderConnection = async (
  provider: StorageProvider,
  token: string | null
) => {
  const response = await fetch(`${env.API_URL}/storage/${provider}/connection`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('Failed to check storage provider connection');
  }

  return await response.json();
};

export const disconnectStorageProvider = async (
  provider: StorageProvider,
  token: string | null
) => {
  const response = await fetch(`${env.API_URL}/storage/${provider}/connection`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to disconnect storage provider');
  }

  return await response.json();
};

export const getCloudProviders = async (token: string | null) => {
  const response = await fetch(`${env.API_URL}/storage/list`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch cloud providers');
  }

  return await response.json();
};
