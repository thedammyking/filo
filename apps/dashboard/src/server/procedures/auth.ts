import { auth } from '@clerk/nextjs/server';
import { createServerActionProcedure } from 'zsa';

export const authenticatedProcedure = createServerActionProcedure().handler(async () => {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      throw new Error('You need to be logged in to continue');
    }

    const token = await getToken();

    return {
      token,
      userId
    };
  } catch {
    throw new Error('You need to be logged in to continue');
  }
});
