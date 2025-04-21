import type { HTMLAttributes } from 'react';
import { cn } from '@filo/ui/lib/utils';
import { CircleAlert } from 'lucide-react';

export function Caption({ className, children }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('flex items-center gap-1 text-sm font-normal text-primary', className)}>
      <CircleAlert className='size-3' />
      {children}
    </p>
  );
}
