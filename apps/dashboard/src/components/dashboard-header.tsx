import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export function DashboardHeader() {
  return (
    <header className='flex items-center justify-between p-4'>
      <Link href='/dashboard' className='flex items-center gap-2'>
        <h1 className='text-2xl font-bold'>Filo</h1>
      </Link>
      <div className='flex shrink-0 items-center gap-2'>
        <UserButton
          signInUrl='/login'
          appearance={{
            elements: {
              userButtonTrigger: 'p-2 border rounded-full border-border',
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
