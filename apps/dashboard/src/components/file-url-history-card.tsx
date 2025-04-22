import type { UploadResponse } from '@filo/interfaces';
import { UPLOAD_STATUS } from '@filo/libs/constants';
import { Badge } from '@filo/ui/components/badge';
import { Button } from '@filo/ui/components/button';
import { format } from 'date-fns';
import { capitalize } from 'lodash';
import { X } from 'lucide-react';
import { DynamicIcon } from 'lucide-react/dynamic';

import { FILE_STATUS_BADGE_VARIANT_MAP } from '@/lib/constants';

interface FileUrlHistoryCardProps {
  data: UploadResponse;
}

export function FileUrlHistoryCard({ data }: FileUrlHistoryCardProps) {
  return (
    <div className='flex flex-col gap-3 border-b border-border pb-6 pt-4'>
      <div className='flex items-center justify-between gap-2'>
        <Badge variant={FILE_STATUS_BADGE_VARIANT_MAP[data.status]}>
          {capitalize(data.status)}
        </Badge>
        <p className='text-sm text-muted-foreground'>
          {data.completedAt ? 'Completed' : 'Added'}:{' '}
          {format(data.completedAt || data.createdAt, 'MMM d, yyyy h:mm a')}
        </p>
      </div>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-[1fr_max-content] md:gap-10'>
        <div className='flex items-center gap-4'>
          <DynamicIcon name={data.type} size={30} className='shrink-0' />
          <p className='break-all text-sm font-medium'>{data.link}</p>
        </div>
        {data.status === UPLOAD_STATUS.PENDING && (
          <Button
            variant='link'
            className='ml-auto w-max p-0 text-red-600 hover:text-red-700 hover:no-underline active:text-red-800 md:ml-0'
          >
            <X className='size-4' />
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
