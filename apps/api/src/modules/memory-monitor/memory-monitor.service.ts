import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import { Readable, PassThrough } from 'stream';
import { MemoryMonitorConfig } from './memory-monitor.config';

export interface MemoryThresholds {
  WARNING: number;
  CRITICAL: number;
  MAX: number;
}

export interface ChunkSizeConfig {
  DEFAULT: number;
  MIN: number;
  MAX: number;
  REDUCTION_FACTOR: number;
  INCREASE_FACTOR: number;
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
}

@Injectable()
export class MemoryMonitorService {
  private readonly logger = new Logger(MemoryMonitorService.name);
  private readonly eventEmitter = new EventEmitter();
  private memoryCheckInterval: NodeJS.Timeout | null = null;
  private lastMemoryUsage = 0;
  private stableMemoryCount = 0;
  private currentChunkSize: number;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<MemoryMonitorConfig>('memoryMonitor');
    if (!config) {
      throw new Error('Memory monitor configuration not found');
    }
    this.currentChunkSize = config.chunkSize.DEFAULT;
  }

  startMonitoring(onChunkSizeChange: (newSize: number) => void): void {
    const config = this.configService.get<MemoryMonitorConfig>('memoryMonitor');
    if (!config) {
      throw new Error('Memory monitor configuration not found');
    }

    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }

    this.memoryCheckInterval = setInterval(() => {
      const metrics = this.getMemoryMetrics();
      const heapUsedMB = Math.round(metrics.heapUsed / 1024 / 1024);

      // Check memory thresholds and adjust chunk size
      if (heapUsedMB >= config.thresholds.MAX) {
        this.logger.error(
          `CRITICAL: Memory usage exceeded maximum threshold! ` +
            `Heap Used: ${heapUsedMB}MB (Max: ${config.thresholds.MAX}MB)`
        );
        this.adjustChunkSize(
          this.currentChunkSize,
          config.chunkSize.REDUCTION_FACTOR,
          onChunkSizeChange
        );
        this.stableMemoryCount = 0;
      } else if (heapUsedMB >= config.thresholds.CRITICAL) {
        this.logger.warn(
          `WARNING: Memory usage approaching maximum! ` +
            `Heap Used: ${heapUsedMB}MB (Critical: ${config.thresholds.CRITICAL}MB)`
        );
        this.adjustChunkSize(
          this.currentChunkSize,
          config.chunkSize.REDUCTION_FACTOR,
          onChunkSizeChange
        );
        this.stableMemoryCount = 0;
      } else if (heapUsedMB >= config.thresholds.WARNING) {
        this.logger.warn(
          `WARNING: Memory usage is high! ` +
            `Heap Used: ${heapUsedMB}MB (Warning: ${config.thresholds.WARNING}MB)`
        );
        this.adjustChunkSize(
          this.currentChunkSize,
          config.chunkSize.REDUCTION_FACTOR,
          onChunkSizeChange
        );
        this.stableMemoryCount = 0;
      }

      // Check for stable memory usage
      if (Math.abs(heapUsedMB - this.lastMemoryUsage) < config.monitoring.STABLE_MEMORY_DELTA) {
        this.stableMemoryCount++;
        if (this.stableMemoryCount >= config.monitoring.STABLE_MEMORY_THRESHOLD) {
          this.adjustChunkSize(
            this.currentChunkSize,
            config.chunkSize.INCREASE_FACTOR,
            onChunkSizeChange
          );
          this.stableMemoryCount = 0;
        }
      } else {
        this.stableMemoryCount = 0;
      }

      this.lastMemoryUsage = heapUsedMB;

      // Log memory usage
      this.logger.debug(
        `Memory usage - ` +
          `Heap Used: ${heapUsedMB}MB, ` +
          `Heap Total: ${Math.round(metrics.heapTotal / 1024 / 1024)}MB, ` +
          `RSS: ${Math.round(metrics.rss / 1024 / 1024)}MB, ` +
          `External: ${Math.round(metrics.external / 1024 / 1024)}MB, ` +
          `Chunk Size: ${this.currentChunkSize / 1024}KB`
      );

      // Emit memory metrics event
      this.eventEmitter.emit('memoryMetrics', metrics);
    }, config.monitoring.CHECK_INTERVAL_MS);
  }

  private adjustChunkSize(
    currentSize: number,
    factor: number,
    onChunkSizeChange: (newSize: number) => void
  ): void {
    const config = this.configService.get<MemoryMonitorConfig>('memoryMonitor');
    if (!config) {
      throw new Error('Memory monitor configuration not found');
    }

    const newChunkSize = Math.floor(currentSize * factor);
    const adjustedChunkSize = Math.max(
      config.chunkSize.MIN,
      Math.min(config.chunkSize.MAX, newChunkSize)
    );

    if (adjustedChunkSize !== currentSize) {
      this.currentChunkSize = adjustedChunkSize;
      this.logger.log(
        `${factor > 1 ? 'Increasing' : 'Reducing'} chunk size to ${adjustedChunkSize / 1024}KB`
      );
      onChunkSizeChange(adjustedChunkSize);
    }
  }

  private getMemoryMetrics(): MemoryMetrics {
    const memoryUsage = process.memoryUsage();
    return {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      rss: memoryUsage.rss,
      external: memoryUsage.external
    };
  }

  onMemoryMetrics(callback: (metrics: MemoryMetrics) => void): void {
    this.eventEmitter.on('memoryMetrics', callback);
  }

  stopMonitoring(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    this.eventEmitter.removeAllListeners();
  }
}
