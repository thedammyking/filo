import type { ClerkClient } from '@clerk/backend';

export type UserListParams = Parameters<ClerkClient['users']['getUserList']>[0];

export type UpdateUserParams = Parameters<ClerkClient['users']['updateUser']>[1];

export type CreateUserParams = Parameters<ClerkClient['users']['createUser']>[0];
