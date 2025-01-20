import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { UsersModule } from '@/modules/users/users.module';

import { AuthController } from './auth.controller';
import { ClerkStrategy } from './clerk.strategy';

@Module({
  controllers: [AuthController],
  imports: [PassportModule, UsersModule, ConfigModule],
  providers: [ClerkStrategy],
  exports: [PassportModule]
})
export class AuthModule {}
