import { STORAGE_PROVIDER_DETAILS } from '@filo/libs/constants';
import { Button } from '@filo/ui/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@filo/ui/components/dialog';
import { uniqueId } from 'lodash';
import { X } from 'lucide-react';
import Image from 'next/image';

interface ManageStorageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManageStorageDialog: React.FC<ManageStorageDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[44rem] w-[90vw] max-w-none flex-col gap-y-4 rounded-xl border-border p-7 outline-none sm:w-[32rem] sm:rounded-xl md:w-[55rem]'>
        <DialogHeader className='flex flex-col gap-y-3'>
          <DialogTitle className='text-3xl'>Manage Storage</DialogTitle>
          <DialogDescription className='text-md text-accent-foreground'>
            Select a storage and connect or disconnect from your storage
          </DialogDescription>
        </DialogHeader>
        <div className='flex w-full items-center justify-center'>
          {Object.values(STORAGE_PROVIDER_DETAILS).map(provider => (
            <Button
              type='button'
              variant='ghost'
              key={uniqueId('storage-provider-')}
              className='flex h-max min-w-[120px] flex-col items-center justify-center gap-y-4 p-4 data-[selected=true]:bg-accent'
            >
              <Image
                src={`/${provider.value}.svg`}
                alt={provider.name}
                width={50}
                height={50}
                className='size-[50px]'
                objectFit='fill'
              />
              <h3>{provider?.name}</h3>
            </Button>
          ))}
        </div>
        <DialogClose className='min-h-1 p-3 hover:bg-accent/50 hover:text-accent-foreground/75'>
          <X className='size-4' />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};
