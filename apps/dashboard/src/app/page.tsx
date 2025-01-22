'use client';

import { useAuth } from '@clerk/nextjs';
import { Button } from '@filo/ui/components/button';

import { GoogleDriveConnect } from '@/components/google-drive-connect';

export default function Page() {
  const { signOut } = useAuth();

  return (
    <div className='flex min-h-svh items-center justify-center'>
      <div className='flex flex-col items-center justify-center gap-4'>
        <h1 className='text-2xl font-bold'>Hello World</h1>
        <Button className='min-w-24' size='sm' onClick={() => signOut()}>
          Sign Out
        </Button>
        <GoogleDriveConnect />
      </div>
    </div>
  );
}
