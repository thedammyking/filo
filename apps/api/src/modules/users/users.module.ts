import { Module } from '@nestjs/common';

import { ClerkClientProvider } from '@/commons/providers/clerk-client.provider';

import { UsersService } from './users.service';

@Module({
  providers: [UsersService, ClerkClientProvider],
  exports: [UsersService]
})
export class UsersModule {}
