import { Controller, Get, Res } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  MicroserviceHealthIndicator
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { register, collectDefaultMetrics } from 'prom-client';
import { Response } from 'express';
import { Public } from '@/commons/decorators/public.decorator'; // Assuming you have this
import { Transport } from '@nestjs/microservices'; // Add Transport

// Optional: Collect default Node.js and process metrics
collectDefaultMetrics({ prefix: 'nodejs_' });

// Example custom metric (Gauge for active connections or similar)
// new Gauge({
//   name: 'filo_api_active_connections',
//   help: 'Number of active connections to the Filo API',
//   labelNames: ['type'],
// });

@Controller('metrics') // Base path /api/v1/metrics
export class MetricsController {
  private readonly redisHost: string;
  private readonly redisPort: number;
  private readonly redisPassword?: string;

  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private microservice: MicroserviceHealthIndicator,
    private configService: ConfigService
  ) {
    this.redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    this.redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    this.redisPassword = this.configService.get<string>('REDIS_PASSWORD');
  }

  @Public() // Make it public for Prometheus scraping
  @Get() // Path /api/v1/metrics
  async getMetrics(@Res() res: Response) {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  }

  @Public() // Make it public for health checking tools
  @Get('health-detailed') // Path /api/v1/metrics/health-detailed
  @HealthCheck()
  checkHealth() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 1500 }),
      () =>
        this.microservice.pingCheck('redis', {
          transport: Transport.REDIS,
          options: {
            host: this.redisHost,
            port: this.redisPort,
            ...(this.redisPassword && { password: this.redisPassword }),
            retryAttempts: 3,
            retryDelay: 1000
          },
          timeout: 1500
        }),
      () => this.memory.checkHeap('memory_heap', 250 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      () => this.disk.checkStorage('disk_storage', { path: '/', thresholdPercent: 0.8 })
    ]);
  }
}
