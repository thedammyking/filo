import type { CookieAttributes } from 'node_modules/@types/js-cookie';

export const CLOUD_PROVIDER_COOKIE_NAME = `__storage_provider_` as const;

export const CLOUD_PROVIDER_COOKIE_OPTIONS: CookieAttributes = {
  sameSite: 'strict',
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  secure: process.env.NODE_ENV === 'production',
  expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
} as const;
