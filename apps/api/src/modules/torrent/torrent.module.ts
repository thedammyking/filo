import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TorrentService } from './torrent.service';
import { TorrentWorkerService } from './torrent.worker.service';
import { UploadsModule } from '@/modules/uploads/uploads.module';
import { StorageModule } from '@/modules/storage/storage.module';
import { MemoryMonitorService } from '../memory-monitor/memory-monitor.service';
@Module({
  imports: [
    ConfigModule.forRoot(), // Initialize ConfigModule
    forwardRef(() => UploadsModule), // Use forwardRef if UploadsModule might import TorrentModule (circular dependency)
    StorageModule
  ],
  providers: [TorrentService, TorrentWorkerService, MemoryMonitorService],
  exports: [TorrentService]
})
export class TorrentModule {}
