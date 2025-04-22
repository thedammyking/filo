'use server';

import type { PaginatedResponse, UploadResponse } from '@filo/interfaces';
import { z } from 'zod';

import { fileUrlInputSchema } from '@/validations/file-url-input';

import { authenticatedProcedure } from '../procedures/auth';
import * as uploadsService from '../services/uploads';

export const createUpload = authenticatedProcedure
  .createServerAction()
  .input(
    fileUrlInputSchema.extend({
      storageId: z.string()
    })
  )
  .handler(async ({ ctx, input }) => {
    const { token } = ctx;
    try {
      const response = await uploadsService.createUpload(input, token);
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'There was an error creating the upload.');
    }
  });

export const getUploads = authenticatedProcedure
  .createServerAction()
  .input(
    z
      .object({
        page: z.number().optional(),
        limit: z.number().optional(),
        status: z.string().optional(),
        storageId: z.string().optional()
      })
      .optional()
  )
  .handler(async ({ ctx, input }): Promise<PaginatedResponse<UploadResponse>> => {
    const { token } = ctx;
    try {
      const response = await uploadsService.getUploads(token, input as any);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'There was an error getting the uploads.');
    }
  });
