import { Card, CardContent, CardFooter } from '@filo/ui/components/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@filo/ui/components/dialog';
import { X } from 'lucide-react';

import ConnectButton from './storage-providers/connection-button';
import StorageProvidersContextProvider from './storage-providers/context-provider';
import ProvidersList from './storage-providers/providers-list';

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
            Select a storage to connect or disconnect
          </DialogDescription>
        </DialogHeader>
        <div className='mt-[120px] flex w-full justify-center'>
          <Card className='w-full sm:w-96'>
            <StorageProvidersContextProvider>
              <CardContent>
                <ProvidersList />
              </CardContent>
              <CardFooter className='flex flex-col items-center justify-center gap-2'>
                <ConnectButton />
              </CardFooter>
            </StorageProvidersContextProvider>
          </Card>
        </div>
        <DialogClose className='min-h-1 p-3 hover:bg-accent/50 hover:text-accent-foreground/75'>
          <X className='size-4' />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};
