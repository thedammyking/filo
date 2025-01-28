'use client';

import React from 'react';
import type { UserProfile } from '@clerk/nextjs';
import { useTheme } from 'next-themes';

import { ThemeMode } from '@/types/enums';

export const useClerkTheme = ():
  | Required<React.ComponentProps<typeof UserProfile>>['appearance']['variables']
  | undefined => {
  const { resolvedTheme: activeTheme } = useTheme();

  const theme = React.useMemo(
    () =>
      activeTheme
        ? {
            [ThemeMode.Dark]: {
              colorPrimary: 'hsl(0 0% 98%)',
              colorDanger: 'hsl(0 62.8% 30.6%)',
              colorNeutral: 'hsl(0 0% 98%)',
              colorText: 'hsl(0 0% 98%)',
              colorTextOnPrimaryBackground: 'hsl(240 10% 3.9%)',
              colorTextSecondary: 'hsl(240 4.8% 95.9%)',
              colorBackground: 'hsl(240 10% 3.9%)',
              colorInputText: 'hsl(240 5.9% 90%)',
              colorInputBackground: 'hsl(240 10% 3.9%)'
            },
            [ThemeMode.Light]: {
              colorPrimary: 'hsl(240 5.9% 10%)',
              colorDanger: 'hsl(0 84.2% 60.2%)',
              colorNeutral: 'hsl(240 5.9% 10%)',
              colorText: 'hsl(240 5.9% 10%)',
              colorTextOnPrimaryBackground: 'hsl(0 0% 100%)',
              colorTextSecondary: 'hsl(240 3.7% 15.9%)',
              colorBackground: 'hsl(0 0% 100%)',
              colorInputText: 'hsl(240 3.7% 15.9%)',
              colorInputBackground: 'hsl(0 0% 100%)'
            }
          }[activeTheme]
        : undefined,
    [activeTheme]
  );

  return theme;
};
