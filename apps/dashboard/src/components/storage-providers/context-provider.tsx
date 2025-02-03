'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import type { StorageProvider } from '@filo/interfaces';
import { STORAGE_PROVIDER } from '@filo/libs/constants';

type StorageProvidersContext = {
  selected: StorageProvider | null;
  setSelected: (provider: StorageProvider) => void;
};

const StorageProvidersContext = createContext<StorageProvidersContext>({
  selected: null,
  setSelected: () => {}
});

export const useStorageProvidersContext = () => {
  const context = useContext(StorageProvidersContext);
  if (!context) {
    throw new Error('useStorageProvidersContext must be used within an StorageProvidersContext');
  }
  return context;
};

const StorageProvidersContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [selected, setSelected] = useState<StorageProvider>(STORAGE_PROVIDER.GOOGLE_DRIVE);

  const value = useMemo(() => ({ selected, setSelected }), [selected, setSelected]);

  return <StorageProvidersContext value={value}>{children}</StorageProvidersContext>;
};

StorageProvidersContextProvider.displayName = 'StorageProvidersContextProvider';

export default StorageProvidersContextProvider;
