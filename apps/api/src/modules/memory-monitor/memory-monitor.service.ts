import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import { Readable, PassThrough } from 'stream';

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
    this.currentChunkSize =
      this.configService.get<number>('memoryMonitor.chunkSize.DEFAULT') ?? 1024 * 1024;
  }

  startMonitoring(onChunkSizeChange: (newSize: number) => void): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }

    const checkInterval =
      this.configService.get<number>('memoryMonitor.monitoring.CHECK_INTERVAL_MS') ?? 5000;
    const warningThreshold =
      this.configService.get<number>('memoryMonitor.thresholds.WARNING') ?? 512;
    const criticalThreshold =
      this.configService.get<number>('memoryMonitor.thresholds.CRITICAL') ?? 768;
    const maxThreshold = this.configService.get<number>('memoryMonitor.thresholds.MAX') ?? 1024;
    const stableThreshold =
      this.configService.get<number>('memoryMonitor.monitoring.STABLE_MEMORY_THRESHOLD') ?? 3;
    const stableDelta =
      this.configService.get<number>('memoryMonitor.monitoring.STABLE_MEMORY_DELTA') ?? 10;
    const reductionFactor =
      this.configService.get<number>('memoryMonitor.chunkSize.REDUCTION_FACTOR') ?? 0.5;
    const increaseFactor =
      this.configService.get<number>('memoryMonitor.chunkSize.INCREASE_FACTOR') ?? 1.1;

    this.memoryCheckInterval = setInterval(() => {
      const metrics = this.getMemoryMetrics();
      const heapUsedMB = Math.round(metrics.heapUsed / 1024 / 1024);

      // Check memory thresholds and adjust chunk size
      if (heapUsedMB >= maxThreshold) {
        this.logger.error(
          `CRITICAL: Memory usage exceeded maximum threshold! ` +
            `Heap Used: ${heapUsedMB}MB (Max: ${maxThreshold}MB)`
        );
        this.adjustChunkSize(this.currentChunkSize, reductionFactor, onChunkSizeChange);
        this.stableMemoryCount = 0;
      } else if (heapUsedMB >= criticalThreshold) {
        this.logger.warn(
          `WARNING: Memory usage approaching maximum! ` +
            `Heap Used: ${heapUsedMB}MB (Critical: ${criticalThreshold}MB)`
        );
        this.adjustChunkSize(this.currentChunkSize, reductionFactor, onChunkSizeChange);
        this.stableMemoryCount = 0;
      } else if (heapUsedMB >= warningThreshold) {
        this.logger.warn(
          `WARNING: Memory usage is high! ` +
            `Heap Used: ${heapUsedMB}MB (Warning: ${warningThreshold}MB)`
        );
        this.adjustChunkSize(this.currentChunkSize, reductionFactor, onChunkSizeChange);
        this.stableMemoryCount = 0;
      }

      // Check for stable memory usage
      if (Math.abs(heapUsedMB - this.lastMemoryUsage) < stableDelta) {
        this.stableMemoryCount++;
        if (this.stableMemoryCount >= stableThreshold) {
          this.adjustChunkSize(this.currentChunkSize, increaseFactor, onChunkSizeChange);
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
    }, checkInterval);
  }

  private adjustChunkSize(
    currentSize: number,
    factor: number,
    onChunkSizeChange: (newSize: number) => void
  ): void {
    const minChunkSize =
      this.configService.get<number>('memoryMonitor.chunkSize.MIN') ?? 256 * 1024;
    const maxChunkSize =
      this.configService.get<number>('memoryMonitor.chunkSize.MAX') ?? 4 * 1024 * 1024;

    const newChunkSize = Math.floor(currentSize * factor);
    const adjustedChunkSize = Math.max(minChunkSize, Math.min(maxChunkSize, newChunkSize));

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
