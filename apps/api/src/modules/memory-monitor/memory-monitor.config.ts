import { registerAs } from '@nestjs/config';

export interface MemoryMonitorConfig {
  thresholds: {
    WARNING: number; // MB
    CRITICAL: number; // MB
    MAX: number; // MB
  };
  chunkSize: {
    DEFAULT: number; // bytes
    MIN: number; // bytes
    MAX: number; // bytes
    REDUCTION_FACTOR: number;
    INCREASE_FACTOR: number;
  };
  monitoring: {
    STABLE_MEMORY_THRESHOLD: number;
    CHECK_INTERVAL_MS: number;
    STABLE_MEMORY_DELTA: number;
  };
}

export default registerAs(
  'memoryMonitor',
  (): MemoryMonitorConfig => ({
    thresholds: {
      WARNING: process.env.MEMORY_WARNING_THRESHOLD
        ? parseInt(process.env.MEMORY_WARNING_THRESHOLD, 10)
        : 512,
      CRITICAL: process.env.MEMORY_CRITICAL_THRESHOLD
        ? parseInt(process.env.MEMORY_CRITICAL_THRESHOLD, 10)
        : 768,
      MAX: process.env.MEMORY_MAX_THRESHOLD ? parseInt(process.env.MEMORY_MAX_THRESHOLD, 10) : 1024
    },
    chunkSize: {
      DEFAULT: process.env.CHUNK_SIZE_DEFAULT
        ? parseInt(process.env.CHUNK_SIZE_DEFAULT, 10)
        : 1024 * 1024,
      MIN: process.env.CHUNK_SIZE_MIN ? parseInt(process.env.CHUNK_SIZE_MIN, 10) : 256 * 1024,
      MAX: process.env.CHUNK_SIZE_MAX ? parseInt(process.env.CHUNK_SIZE_MAX, 10) : 4 * 1024 * 1024,
      REDUCTION_FACTOR: process.env.CHUNK_SIZE_REDUCTION_FACTOR
        ? parseFloat(process.env.CHUNK_SIZE_REDUCTION_FACTOR)
        : 0.5,
      INCREASE_FACTOR: process.env.CHUNK_SIZE_INCREASE_FACTOR
        ? parseFloat(process.env.CHUNK_SIZE_INCREASE_FACTOR)
        : 1.1
    },
    monitoring: {
      STABLE_MEMORY_THRESHOLD: process.env.STABLE_MEMORY_THRESHOLD
        ? parseInt(process.env.STABLE_MEMORY_THRESHOLD, 10)
        : 3,
      CHECK_INTERVAL_MS: process.env.MEMORY_CHECK_INTERVAL_MS
        ? parseInt(process.env.MEMORY_CHECK_INTERVAL_MS, 10)
        : 5000,
      STABLE_MEMORY_DELTA: process.env.STABLE_MEMORY_DELTA
        ? parseInt(process.env.STABLE_MEMORY_DELTA, 10)
        : 10
    }
  })
);
