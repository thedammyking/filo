import type { UploadFilterParams } from '@filo/interfaces';
import { infiniteQueryOptions } from '@tanstack/react-query';

import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { getUploads } from '@/server/actions/uploads';

import { uploadKeys } from '../query-keys/uploads';

export const uploadsQueryOptions = (params?: UploadFilterParams) =>
  infiniteQueryOptions({
    queryKey: uploadKeys.list(params),
    queryFn: async ({ pageParam = DEFAULT_PAGE }) => {
      const [data, error] = await getUploads({
        ...params,
        page: pageParam,
        limit: DEFAULT_PAGE_SIZE
      });
      if (error) throw error;
      return data;
    },
    initialPageParam: DEFAULT_PAGE,
    getNextPageParam: response => {
      const {
        metadata: {
          pagination: { total, ...pagination }
        }
      } = response;
      const page = typeof pagination.page === 'number' ? pagination.page : Number(pagination.page);
      const limit =
        typeof pagination.limit === 'number' ? pagination.limit : Number(pagination.limit);
      const totalPages = Math.ceil(total / limit);
      return page < totalPages ? page + 1 : undefined;
    },
    staleTime: 1000 * 60 * 5
  });
