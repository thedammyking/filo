import type { StorageProvider } from '@filo/interfaces';
import type { z } from 'zod';

import type { fileUrlInputSchema } from '@/validations/file-url-input';

export interface CloudProvider {
  id: string;
  provider: StorageProvider;
}

export type FileUrlInputSchema = z.infer<typeof fileUrlInputSchema>;
