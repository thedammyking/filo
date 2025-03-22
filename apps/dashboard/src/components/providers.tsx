'use client';
import type * as React from 'react';
import { ClerkLoaded, ClerkLoading, ClerkProvider as ClerkNextProvider } from '@clerk/nextjs';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

import { useClerkTheme } from '@/hooks/use-clerk-theme';
import queryClient from '@/lib/query-client';

import DefaultLoader from './default-loader';

const ClerkProvider = ({ children }: { children: React.ReactNode }) => {
  const clerkTheme = useClerkTheme();

  return (
    <ClerkNextProvider
      appearance={{
        layout: {
          logoPlacement: 'outside',
          shimmer: true,
          animations: true
        },
        elements: {
          rootBox: 'font-sans',
          footerAction: '[&+div]:hidden',
          input: 'min-h-10',
          button: 'min-h-10'
        },
        variables: {
          fontSize: '16px',
          ...clerkTheme
        }
      }}
    >
      <ClerkLoading>
        <DefaultLoader />
      </ClerkLoading>
      <ClerkLoaded>{children}</ClerkLoaded>
    </ClerkNextProvider>
  );
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute='class'
      defaultTheme='light'
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      <ClerkProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools />
        </QueryClientProvider>
      </ClerkProvider>
    </NextThemesProvider>
  );
}
