'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@filo/ui/components/button';
import { Loader } from 'lucide-react';

export default function Page() {
  const { signOut, getToken } = useAuth();
  const [loading, setLoading] = useState(false);

  const pingApi = async () => {
    try {
      const token = await getToken();
      setLoading(true);
      const response = await fetch('http://localhost:4000/api/v1/storage/GOOGLE_DRIVE/connect', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      window.open(data.data.url, '_blank');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex min-h-svh items-center justify-center'>
      <div className='flex flex-col items-center justify-center gap-4'>
        <h1 className='text-2xl font-bold'>Hello World</h1>
        <div className='flex items-center gap-2'>
          <Button className='flex min-w-24 items-center justify-center' size='sm' onClick={pingApi}>
            {loading ? <Loader className='size-4 animate-spin' /> : 'Ping API'}
          </Button>
          <Button className='min-w-24' size='sm' onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
