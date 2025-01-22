'use server';

import { auth } from '@clerk/nextjs/server';

export async function getGoogleAuthUrl() {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return { error: 'User not found' };
    }

    const token = await getToken();

    const response = await fetch(`${process.env.API_URL}/storage/GOOGLE_DRIVE/connect`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    return { url: data.data.url };
  } catch (error: any) {
    return { error: error.message || 'Failed to get auth URL' };
  }
}

export async function completeGoogleAuth(code: string, state: string) {
  try {
    console.log('completeGoogleAuth', code, state);
    const { userId, getToken } = await auth();
    if (!userId) {
      return { error: 'User not found' };
    }
    const token = await getToken();
    const response = await fetch(
      `${process.env.API_URL}/storage/GOOGLE_DRIVE/callback?code=${code}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log('response', response);

    if (!response.ok) {
      throw new Error('Failed to complete authentication');
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { error: 'Failed to complete authentication' };
  }
}
