import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StorageToken } from './entities/storage-token.entity';
import { GoogleDriveProvider } from './providers/google-drive.provider';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([StorageToken])],
  providers: [StorageService, GoogleDriveProvider],
  exports: [StorageService],
  controllers: [StorageController]
})
export class StorageModule {}
