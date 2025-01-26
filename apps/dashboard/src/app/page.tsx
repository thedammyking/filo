'use client';

import React from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@filo/ui/components/button';

export default function Page() {
  const { signOut, getToken } = useAuth();

  const handleToken = React.useCallback(async () => {
    const token = await getToken();
    console.log(token);
  }, [getToken]);

  React.useEffect(() => {
    handleToken();
  }, [handleToken]);

  return (
    <div className='flex min-h-svh items-center justify-center'>
      <div className='flex flex-col items-center justify-center gap-4'>
        <h1 className='text-2xl font-bold'>Hello World</h1>
        <Button className='min-w-24' size='sm' onClick={() => signOut()}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
