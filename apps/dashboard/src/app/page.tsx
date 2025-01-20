'use client';

import { useAuth } from '@clerk/nextjs';
import { Button } from '@filo/ui/components/button';

export default function Page() {
  const { signOut, getToken } = useAuth();

  const pingApi = async () => {
    const token = await getToken();
    console.log(token);
    const response = await fetch('http://localhost:4000/api/v1/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await response.json();
    console.log(data);
  };

  return (
    <div className='flex min-h-svh items-center justify-center'>
      <div className='flex flex-col items-center justify-center gap-4'>
        <h1 className='text-2xl font-bold'>Hello World</h1>
        <div className='flex items-center gap-2'>
          <Button size='sm' onClick={pingApi}>
            Ping API
          </Button>
          <Button size='sm' onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
