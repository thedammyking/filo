'use client';

import React, { useMemo } from 'react';
import type { UploadStatus } from '@filo/interfaces';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@filo/ui/components/select';
import { Loader } from 'lucide-react';

import { useUploadsList } from '@/hooks/ use-uploads-list';
import { useActiveCloudProvider } from '@/hooks/use-active-cloud-provider';
import { UPLOAD_FILTERS } from '@/lib/constants';

import { FileUrlHistoryList } from './file-url-history-list';

export function FileUrlHistory() {
  const [filter, setFilter] = React.useState<string>(UPLOAD_FILTERS[0].value);
  const activeCloudProvider = useActiveCloudProvider();

  const { data: uploads, isLoading } = useUploadsList({
    status: filter === 'all' ? undefined : (filter as UploadStatus),
    storageId: activeCloudProvider?.id
  });

  const data = useMemo(() => uploads?.pages.map(page => page.data).flat(), [uploads]);

  const handleFilterChange = React.useCallback((value: string) => setFilter(value), []);

  return (
    <div className='flex flex-col gap-8 px-6 pb-10 md:px-0'>
      <div className='flex items-center justify-between'>
        <h1 className='text-xl font-medium'>History</h1>
        <Select value={filter} onValueChange={handleFilterChange}>
          <SelectTrigger className='w-[200px]'>
            <SelectValue placeholder='Filter' />
          </SelectTrigger>
          <SelectContent>
            {UPLOAD_FILTERS.map(filter => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <FileUrlHistoryList uploads={data ?? []} isLoading={isLoading} />
      {isLoading && (
        <div className='flex min-h-[200px] w-full items-center justify-center'>
          <Loader className='size-6 animate-spin' />
        </div>
      )}
    </div>
  );
}
