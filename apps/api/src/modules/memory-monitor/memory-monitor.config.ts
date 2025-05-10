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
      WARNING: 512, // 512MB
      CRITICAL: 768, // 768MB
      MAX: 1024 // 1GB
    },
    chunkSize: {
      DEFAULT: 1024 * 1024, // 1MB
      MIN: 256 * 1024, // 256KB
      MAX: 4 * 1024 * 1024, // 4MB
      REDUCTION_FACTOR: 0.5, // Reduce by half
      INCREASE_FACTOR: 1.1 // Increase by 10%
    },
    monitoring: {
      STABLE_MEMORY_THRESHOLD: 3, // Number of checks with stable memory before increasing chunk size
      CHECK_INTERVAL_MS: 5000, // Check every 5 seconds
      STABLE_MEMORY_DELTA: 10 // MB difference to consider memory stable
    }
  })
);
