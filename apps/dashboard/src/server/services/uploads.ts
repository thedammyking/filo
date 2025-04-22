'use server';

import type { CreateUploadDto } from '@filo/interfaces';

import { env } from '@/evn';

export const createUpload = async (upload: CreateUploadDto, token: string | null) => {
  const response = await fetch(`${env.API_URL}/uploads`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(upload)
  });

  if (!response.ok) {
    throw new Error('Failed to create upload');
  }

  return await response.json();
};

export const getUploads = async (token: string | null, params?: Record<string, string>) => {
  const response = await fetch(
    `${env.API_URL}/uploads${params ? `?${new URLSearchParams(params).toString()}` : ''}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get uploads');
  }

  return await response.json();
};
