import type { CreateUploadDto } from '@filo/interfaces';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import queryClient from '@/lib/query-client';
import { uploadKeys } from '@/queries/query-keys/uploads';
import { createUpload } from '@/server/actions/uploads';

export const useCreateUpload = () => {
  return useMutation({
    mutationFn: async (data: CreateUploadDto) => {
      const [response, error] = await createUpload(data);
      if (error) throw error;
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: uploadKeys.list() });
    },
    onError: (error: any) => {
      toast.error(error.message || 'There was an error creating the upload.');
    }
  });
};
