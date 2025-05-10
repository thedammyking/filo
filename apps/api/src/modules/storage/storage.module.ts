import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemoryMonitorModule } from '@/modules/memory-monitor/memory-monitor.module';
import { Storage } from './entities/storage.entity';
import { GoogleDriveProvider } from './providers/google-drive.provider';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { MemoryMonitorService } from '../memory-monitor/memory-monitor.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Storage])],
  providers: [StorageService, GoogleDriveProvider, MemoryMonitorService],
  exports: [StorageService],
  controllers: [StorageController]
})
export class StorageModule {}
