'use client';
import type * as React from 'react';
import { ClerkLoaded, ClerkLoading, ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

import DefaultLoader from '@/app/auth/login/[[...login]]/loading';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute='class'
      defaultTheme='light'
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      <ClerkProvider
        appearance={{
          layout: {
            logoPlacement: 'outside',
            shimmer: true,
            animations: true
          }
        }}
      >
        <ClerkLoading>
          <DefaultLoader />
        </ClerkLoading>
        <ClerkLoaded>{children}</ClerkLoaded>
      </ClerkProvider>
    </NextThemesProvider>
  );
}
