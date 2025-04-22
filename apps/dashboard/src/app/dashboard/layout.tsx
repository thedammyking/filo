import type { ReactNode } from 'react';
import { SignedIn, UserButton } from '@clerk/nextjs';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import AppHeader from '@/components/app-header';
import AppLayout from '@/components/app-layout';
import StorageProviderMenu from '@/components/storage-providers/storage-providers-menu';
import queryClient from '@/lib/query-client';
import { activeCloudProviderQueryOptions } from '@/queries/query-options/cloud-providers';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  void (await queryClient.prefetchQuery(activeCloudProviderQueryOptions()));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AppLayout
        header={
          <AppHeader>
            <SignedIn>
              <StorageProviderMenu />

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
          </AppHeader>
        }
      >
        {children}
      </AppLayout>
    </HydrationBoundary>
  );
}
