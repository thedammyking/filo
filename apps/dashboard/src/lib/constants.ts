import { UPLOAD_TYPE } from '@filo/libs/constants';

export const CLOUD_PROVIDER_COOKIE_NAME = `__storage_provider_` as const;

export const CLOUD_PROVIDER_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict',
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  secure: process.env.NODE_ENV === 'production',
  expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  path: '/'
} as const;

export const FILE_URL_TYPE_OPTIONS = [
  {
    label: 'File',
    value: UPLOAD_TYPE.FILE
  },
  {
    label: 'Magnet',
    value: UPLOAD_TYPE.MAGNET
  }
] as const;

export const DEFAULT_FILE_URL = {
  link: '',
  linkType: UPLOAD_TYPE.FILE
} as const;
