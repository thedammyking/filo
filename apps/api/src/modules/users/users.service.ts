import { ClerkClient } from '@clerk/backend';
import { CreateUserParams, UpdateUserParams, UserListParams } from '@filo/interfaces';
import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

@Injectable()
export class UsersService {
  // Instantiate Logger
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject('ClerkClient')
    private readonly clerkClient: ClerkClient
  ) {}

  async getAllUsers(params: UserListParams) {
    this.logger.log(`getAllUsers - Fetching users with params: ${JSON.stringify(params)}`);
    try {
      const userListResponse = await this.clerkClient.users.getUserList(params);
      // Access the data array and total count from the paginated response
      const count = userListResponse.data?.length ?? 0;
      const total = userListResponse.totalCount ?? 'unknown';
      this.logger.log(`getAllUsers - Successfully fetched ${count} users (Total: ${total}).`);
      return userListResponse;
    } catch (error) {
      this.logger.error(`getAllUsers - Failed to fetch users: ${error.message}`, error.stack);
      // Consider mapping Clerk errors to NestJS exceptions if needed
      throw new InternalServerErrorException('Failed to fetch users from provider.');
    }
  }

  async getUser(userId: string) {
    this.logger.log(`getUser - Fetching user by ID: ${userId}`);
    try {
      const user = await this.clerkClient.users.getUser(userId);
      this.logger.log(`getUser - Successfully fetched user ID: ${userId}`);
      return user;
    } catch (error) {
      this.logger.error(`getUser - Failed for ID ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch user from provider.');
    }
  }

  async createUser(params: CreateUserParams) {
    // Avoid logging entire params if it contains sensitive data like password
    this.logger.log(`createUser - Attempting to create user. Email: ${params.emailAddress?.[0]}`);
    try {
      const user = await this.clerkClient.users.createUser(params);
      this.logger.log(`createUser - Successfully created user ID: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(`createUser - Failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create user with provider.');
    }
  }

  async updateUser(userId: string, params: UpdateUserParams) {
    // Avoid logging entire params
    this.logger.log(`updateUser - Attempting to update user ID: ${userId}`);
    try {
      const user = await this.clerkClient.users.updateUser(userId, params);
      this.logger.log(`updateUser - Successfully updated user ID: ${userId}`);
      return user;
    } catch (error) {
      this.logger.error(`updateUser - Failed for ID ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update user with provider.');
    }
  }

  async deleteUser(userId: string) {
    this.logger.log(`deleteUser - Attempting to delete user ID: ${userId}`);
    try {
      const result = await this.clerkClient.users.deleteUser(userId);
      this.logger.log(`deleteUser - Successfully deleted user ID: ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`deleteUser - Failed for ID ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete user with provider.');
    }
  }
}
