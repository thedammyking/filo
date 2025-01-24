'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import type { StorageProvider } from '@filo/interfaces';

type OnboardingContext = {
  selected: StorageProvider | null;
  setSelected: (provider: StorageProvider) => void;
};

const OnboradingContext = createContext<OnboardingContext>({
  selected: null,
  setSelected: () => {}
});

export const useOnboardingContext = () => {
  const context = useContext(OnboradingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within an OnboardingProvider');
  }
  return context;
};

const OnboardingProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [selected, setSelected] = useState<StorageProvider | null>(null);

  const value = useMemo(() => ({ selected, setSelected }), [selected, setSelected]);

  return <OnboradingContext value={value}>{children}</OnboradingContext>;
};

OnboardingProvider.displayName = 'OnboardingProvider';

export default OnboardingProvider;
