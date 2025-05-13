import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios'; // Terminus often requires HttpModule
import { MetricsController } from './metrics.controller';

// If you decide to use the @willsoto/nestjs-prometheus package for easier NestJS integration with prom-client:
// import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    TerminusModule.forRoot({
      errorLogStyle: 'pretty' // Or 'json'
    }),
    HttpModule // Required by some Terminus health indicators
    // If using @willsoto/nestjs-prometheus:
    // PrometheusModule.register({
    //   path: '/metrics', // This would handle the /metrics endpoint automatically
    //   defaultMetrics: {
    //     enabled: true,
    //     config: { prefix: 'nodejs_' },
    //   },
    // }),
  ],
  controllers: [MetricsController]
  // providers: [], // Add custom metric providers if needed
})
export class MetricsModule {}
