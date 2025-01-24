import { ClerkClient } from '@clerk/backend';
import { CreateUserParams, UpdateUserParams, UserListParams } from '@filo/interfaces';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor(
    @Inject('ClerkClient')
    private readonly clerkClient: ClerkClient
  ) {}

  async getAllUsers(params: UserListParams) {
    return this.clerkClient.users.getUserList(params);
  }

  async getUser(userId: string) {
    return this.clerkClient.users.getUser(userId);
  }

  async createUser(params: CreateUserParams) {
    return this.clerkClient.users.createUser(params);
  }

  async updateUser(userId: string, params: UpdateUserParams) {
    return this.clerkClient.users.updateUser(userId, params);
  }

  async deleteUser(userId: string) {
    return this.clerkClient.users.deleteUser(userId);
  }
}
