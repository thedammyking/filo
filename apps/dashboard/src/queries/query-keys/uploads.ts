import type { UploadFilterParams } from '@filo/interfaces';

export const uploadKeys = {
  uploads: () => ['uploads'],
  list: (params?: UploadFilterParams) => [
    ...uploadKeys.uploads(),
    'list',
    ...Object.values(params ?? {})
  ]
};
