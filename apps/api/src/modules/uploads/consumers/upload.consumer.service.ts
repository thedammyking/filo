import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { UPLOAD_JOB, UPLOAD_QUEUE } from '@/queue/queue.constants';
import type { UploadJobData } from '@/queue/producers/upload.producer.service';
import { UploadsService } from '../uploads.service';
import { StorageService } from '@/modules/storage/storage.service';
import axios from 'axios';
import { UPLOAD_STATUS } from '@filo/libs/constants';
import { Upload } from '../entities/upload.entity';

@Injectable()
@Processor(UPLOAD_QUEUE)
export class UploadConsumerService extends WorkerHost {
  private readonly logger = new Logger(UploadConsumerService.name);

  constructor(
    private readonly uploadsService: UploadsService,
    private readonly storageService: StorageService,
    @InjectQueue(UPLOAD_QUEUE) private readonly uploadQueue: Queue
  ) {
    super();
  }

  async process(job: Job<UploadJobData>): Promise<void> {
    this.logger.log(
      `Processing job ${job.id} of type ${job.name} with data ${JSON.stringify(job.data)}`
    );
    const { uploadId } = job.data;

    let upload: Upload | null = null;
    try {
      upload = await this.uploadsService._internalFindOneById(uploadId);

      if (!upload || !upload.link || !upload.storage?.id || !upload.userId) {
        throw new Error(
          `Upload ${uploadId} not found or missing required data (link, storage.id, userId).`
        );
      }

      if (upload.status !== UPLOAD_STATUS.PENDING) {
        this.logger.warn(
          `Upload ${uploadId} is not in PENDING state (current: ${upload.status}). Skipping.`
        );
        return;
      }

      await this.uploadsService.update(
        uploadId,
        { status: UPLOAD_STATUS.PROCESSING },
        upload.userId
      );

      const response = await axios({
        method: 'get',
        url: upload.link,
        responseType: 'stream'
      });

      const fileStream = response.data;
      const fileName = upload.fileName || `upload_${uploadId}`;

      await this.storageService.uploadStream({
        stream: fileStream,
        filename: fileName,
        storageId: upload.storage.id,
        userId: upload.userId
      });

      await this.uploadsService.update(uploadId, { status: UPLOAD_STATUS.SUCCESS }, upload.userId);
      this.logger.log(`Successfully processed job ${job.id} for upload ${uploadId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process job ${job.id} for upload ${uploadId}: ${error.message}`,
        error.stack
      );
      if (upload && upload.userId) {
        const currentUpload = await this.uploadsService._internalFindOneById(uploadId);
        if (currentUpload && currentUpload.status !== UPLOAD_STATUS.SUCCESS) {
          try {
            await this.uploadsService.update(
              uploadId,
              { status: UPLOAD_STATUS.FAILED },
              upload.userId
            );
          } catch (updateError) {
            this.logger.error(
              `Failed to update status to FAILED for job ${job.id} / upload ${uploadId}: ${updateError.message}`,
              updateError.stack
            );
          }
        }
      }
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed with error: ${error.message}`, error.stack);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed successfully.`);
  }
}
