import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { UsersModule } from '@/modules/users/users.module';

import { ClerkStrategy } from './strategies/clerk.strategy';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  imports: [PassportModule, UsersModule, ConfigModule],
  providers: [ClerkStrategy],
  exports: [PassportModule]
})
export class AuthModule {}
