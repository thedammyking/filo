'use client';

import type { UploadResponse } from '@filo/interfaces';

import { FileUrlHistoryCard } from './file-url-history-card';

interface FileUrlHistoryListProps {
  uploads: UploadResponse[];
  isLoading: boolean;
}

export function FileUrlHistoryList({ uploads, isLoading }: FileUrlHistoryListProps) {
  if (isLoading) {
    return null;
  }
  if (uploads.length === 0) {
    return (
      <div className='flex min-h-[200px] w-full items-center justify-center text-center'>
        <div className='flex flex-col gap-2'>
          <h2 className='text-xl font-medium'>No uploads found</h2>
          <p className='text-sm text-muted-foreground'>
            Upload files by pasting the URL into the form above.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className='flex flex-col gap-4'>
      {uploads.map(upload => (
        <FileUrlHistoryCard key={upload.id} data={upload} />
      ))}
    </div>
  );
}
