import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';

import { HttpExceptionFilter } from '@/commons/filters/http-exception.filter';
import { ResponseInterceptor } from '@/commons/interceptors/response.interceptor';
import { ClerkClientProvider } from '@/commons/providers/clerk-client.provider';
import { AuthModule } from '@/modules/auth/auth.module';
import { ClerkAuthGuard } from '@/modules/auth/guards/clerk-auth.guard';
import { StorageModule } from '@/modules/storage/storage.module';
import { UsersModule } from '@/modules/users/users.module';
import { UploadsModule } from '@/modules/uploads/uploads.module';
import { QueueModule } from '@/modules/queue/queue.module';
import { TorrentModule } from '@/modules/torrent/torrent.module';
import { MemoryMonitorModule } from '@/modules/memory-monitor/memory-monitor.module';

import { AppController } from './app.controller';
import { CatchEverythingFilter } from '@/commons/filters/catch-everything.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        const serviceName = configService.get<string>('SERVICE_NAME', 'filo-api');

        return {
          pinoHttp: {
            genReqId: (req, res) => {
              const existingID = req.id ?? req.headers['x-request-id'];
              if (existingID) return existingID;
              const id = randomUUID();
              res.setHeader('X-Request-Id', id);
              return id;
            },
            customProps: (req, res) => {
              const userId = (req as Express.Request).auth?.userId;
              return {
                context: 'HTTP',
                service: serviceName,
                environment: configService.get<string>('NODE_ENV'),
                ...(userId && { userId })
              };
            },
            redact: {
              paths: ['req.headers.authorization', 'req.headers.cookie'],
              censor: '**REDACTED**'
            },
            transport: !isProduction
              ? {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                    levelFirst: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname,reqId,context,service,environment'
                  }
                }
              : undefined,
            level: isProduction ? 'info' : 'debug'
          }
        };
      }
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [__dirname + '/../**/*.entity.ts'],
        autoLoadEntities: true,
        synchronize: false
      })
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('THROTTLE_TTL'),
          limit: config.get('THROTTLE_LIMIT')
        }
      ]
    }),
    UsersModule,
    AuthModule,
    StorageModule,
    UploadsModule,
    QueueModule,
    TorrentModule,
    MemoryMonitorModule
  ],
  providers: [
    { provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true }) },
    ClerkClientProvider,
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter
    },
    {
      provide: APP_FILTER,
      useClass: CatchEverythingFilter
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor
    }
  ],
  controllers: [AppController]
})
export class AppModule {}
