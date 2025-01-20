import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { ClerkClientProvider } from '@/commons/providers/clerk-client.provider';

import { AuthModule } from '../auth/auth.module';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { UsersModule } from '../users/users.module';

import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    UsersModule,
    AuthModule
  ],
  providers: [
    ClerkClientProvider,
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard
    }
  ],
  controllers: [AppController]
})
export class AppModule {}
