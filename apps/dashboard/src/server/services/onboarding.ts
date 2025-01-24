import { clerkClient } from '@clerk/nextjs/server';
import type { UpdateUserParams } from '@filo/interfaces';

export const completeOnboarding = async (userId: string, data: UpdateUserParams) => {
  const client = await clerkClient();

  return await client.users.updateUser(userId, data);
};
