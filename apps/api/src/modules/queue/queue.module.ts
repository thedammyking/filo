import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UploadProducerService } from './producers/upload.producer.service';
// import { UploadConsumerService } from './consumers/upload.consumer.service'; // Removed
import { UPLOAD_QUEUE } from './queue.constants';
// import { UploadsModule } from '@/modules/uploads/uploads.module'; // Removed
// import { StorageModule } from '@/modules/storage/storage.module'; // Removed

@Module({
  imports: [
    // ConfigModule is likely global in AppModule, but keep if needed here
    ConfigModule,
    // Configure global BullMQ connection settings
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD')
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 }
        }
      }),
      inject: [ConfigService]
    }),
    // Register the queue name so the producer can inject it
    BullModule.registerQueue({
      name: UPLOAD_QUEUE
    })
    // Removed UploadsModule and StorageModule imports
  ],
  // Provide only the producer service
  providers: [UploadProducerService],
  // Export the producer service for other modules (like UploadsModule) to use
  exports: [UploadProducerService]
})
export class QueueModule {}
