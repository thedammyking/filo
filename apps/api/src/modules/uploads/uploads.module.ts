import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { Upload } from './entities/upload.entity';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { Storage } from '@/modules/storage/entities/storage.entity';
import { StorageModule } from '@/modules/storage/storage.module';
import { QueueModule } from '@/modules/queue/queue.module';
import { UPLOAD_QUEUE } from '@/modules/queue/queue.constants';
import { UploadConsumerService } from './consumers/upload.consumer.service';
import { FileModule } from '@/modules/file/file.module';
import { SecurityModule } from '@/modules/security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Upload, Storage]),
    StorageModule,
    QueueModule,
    BullModule.registerQueue({
      name: UPLOAD_QUEUE
    }),
    FileModule,
    SecurityModule
  ],
  controllers: [UploadsController],
  providers: [UploadsService, UploadConsumerService],
  exports: [UploadsService]
})
export class UploadsModule {}
