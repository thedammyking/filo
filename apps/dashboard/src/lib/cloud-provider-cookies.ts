import type { StorageProvider } from '@filo/interfaces';
import Cookies from 'js-cookie';

import { CLOUD_PROVIDER_COOKIE_NAME, CLOUD_PROVIDER_COOKIE_OPTIONS } from './constants';

export const setCloudProviderCookie = (provider: StorageProvider) => {
  Cookies.set(CLOUD_PROVIDER_COOKIE_NAME, provider, CLOUD_PROVIDER_COOKIE_OPTIONS);
};

export const getCloudProviderCookie = () => {
  return Cookies.get(CLOUD_PROVIDER_COOKIE_NAME) as StorageProvider;
};
