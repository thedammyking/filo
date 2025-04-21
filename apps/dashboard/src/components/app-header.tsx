import { SignedIn, UserButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import { cn } from '@filo/ui/lib/utils';
import Link from 'next/link';

import StorageProviderMenu from './storage-providers/storage-providers-menu';

const AppHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = async ({
  className,
  ...props
}) => {
  const user = await currentUser();
  const isOnboardingComplete = user?.publicMetadata.onboardingComplete;

  return (
    <header className={cn('flex w-full items-center justify-between p-4', className)} {...props}>
      <Link href='/dashboard' className='flex items-center gap-2'>
        <h1 className='text-2xl font-bold'>Filo</h1>
      </Link>
      <div className='flex shrink-0 items-center gap-5'>
        <SignedIn>
          {isOnboardingComplete && <StorageProviderMenu />}
          <UserButton
            appearance={{
              elements: {
                userButtonTrigger: 'p-2 border rounded-full border-input',
                userButtonPopoverFooter: 'hidden',
                popoverBox: 'shadow-md rounded-md border bg-popover'
              }
            }}
            userProfileProps={{
              appearance: {
                elements: { rootBox: '', userButtonPopoverFooter: 'hidden' }
              }
            }}
          />
        </SignedIn>
      </div>
    </header>
  );
};

export default AppHeader;
