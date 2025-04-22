import { UPLOAD_STATUS, UPLOAD_TYPE } from '@filo/libs/constants';

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
  type: UPLOAD_TYPE.FILE
} as const;

export const FILE_STATUS_BADGE_VARIANT_MAP = {
  [UPLOAD_STATUS.PENDING]: 'warning',
  [UPLOAD_STATUS.SUCCESS]: 'success',
  [UPLOAD_STATUS.FAILED]: 'destructive',
  [UPLOAD_STATUS.PROCESSING]: 'default'
} as const;

export const DEFAULT_PAGE_SIZE = 10;
export const DEFAULT_PAGE = 1;

export const UPLOAD_FILTERS = [
  {
    label: 'All',
    value: 'all'
  },
  {
    label: 'Pending',
    value: UPLOAD_STATUS.PENDING
  },
  {
    label: 'Success',
    value: UPLOAD_STATUS.SUCCESS
  },
  {
    label: 'Failed',
    value: UPLOAD_STATUS.FAILED
  }
] as const;
