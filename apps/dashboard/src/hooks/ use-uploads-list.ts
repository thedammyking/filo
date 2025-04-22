import type { UploadFilterParams } from '@filo/interfaces';
import { useInfiniteQuery } from '@tanstack/react-query';

import { uploadsQueryOptions } from '@/queries/query-options/uploads';

export const useUploadsList = (params?: UploadFilterParams) => {
  return useInfiniteQuery(uploadsQueryOptions(params));
};
