'use client';
import type * as React from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute='class'
      defaultTheme='system'
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
          },
          baseTheme: dark
        }}
      >
        {children}
      </ClerkProvider>
    </NextThemesProvider>
  );
}
