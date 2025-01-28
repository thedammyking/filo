import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

import { getCloudProviders } from '@/server/actions/storage-provider';

import CloudProviderMenu from './cloud-providers-menu';

export async function DashboardHeader() {
  const [cloudProviders] = await getCloudProviders();

  return (
    <header className='flex items-center justify-between p-4'>
      <Link href='/dashboard' className='flex items-center gap-2'>
        <h1 className='text-2xl font-bold'>Filo</h1>
      </Link>
      <div className='flex shrink-0 items-center gap-5'>
        <CloudProviderMenu providers={cloudProviders || []} />
        <UserButton
          signInUrl='/login'
          appearance={{
            elements: {
              userButtonTrigger: 'p-2 border rounded-full border-input',
              userButtonPopoverFooter: 'hidden'
            }
          }}
          userProfileProps={{
            appearance: {
              elements: { rootBox: '', userButtonPopoverFooter: 'hidden' }
            }
          }}
        />
      </div>
    </header>
  );
}
