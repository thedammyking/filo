import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MemoryMonitorService } from './memory-monitor.service';
import memoryMonitorConfig from './memory-monitor.config';

@Module({
  imports: [ConfigModule.forFeature(memoryMonitorConfig)],
  providers: [MemoryMonitorService],
  exports: [MemoryMonitorService]
})
export class MemoryMonitorModule {}
