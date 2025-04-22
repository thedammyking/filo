import { z } from 'zod';

import { validateMagnetLink, validateUrl } from '@/lib/utils';

const magnetOrUrlSchema = z.string().refine(
  val => {
    const isMagnet = validateMagnetLink(val);
    const isUrl = validateUrl(val);
    return isMagnet || isUrl;
  },
  {
    message: 'Must be a valid magnet link or URL'
  }
);

export const fileUrlInputSchema = z.object({
  links: z.array(
    z.object({
      link: magnetOrUrlSchema,
      type: z.enum(['file', 'magnet'], {
        message: 'Select the type of the URL'
      })
    })
  )
});
