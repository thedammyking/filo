import type { StorageProvider } from '@filo/interfaces';

export interface CloudProvider {
  id: string;
  provider: StorageProvider;
}
