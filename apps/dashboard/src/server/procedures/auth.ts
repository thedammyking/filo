import { auth } from '@clerk/nextjs/server';
import { createServerActionProcedure } from 'zsa';

export const authedProcedure = createServerActionProcedure().handler(async () => {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      throw new Error('You need to be logged in to continue');
    }

    const token = await getToken();

    return {
      token
    };
  } catch {
    throw new Error('You need to be logged in to continue');
  }
});
