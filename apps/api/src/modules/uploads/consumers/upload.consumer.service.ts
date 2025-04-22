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
import { parse } from 'url';
import { basename } from 'path';
import contentDisposition from 'content-disposition';

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

  private extractFilename(uploadLink: string, headers: any): string {
    let filename: string | undefined;

    const dispositionHeader = headers['content-disposition'];
    if (dispositionHeader) {
      try {
        const disposition = contentDisposition.parse(dispositionHeader);
        if (disposition.parameters && disposition.parameters.filename) {
          filename = disposition.parameters.filename;
          this.logger.debug(`Extracted filename from Content-Disposition: ${filename}`);
        }
      } catch (e) {
        this.logger.warn(`Failed to parse Content-Disposition header: ${dispositionHeader}`, e);
      }
    }

    if (!filename) {
      try {
        const parsedUrl = parse(uploadLink);
        if (parsedUrl.pathname) {
          const base = basename(parsedUrl.pathname);
          if (base && base !== '/' && base.includes('.')) {
            filename = decodeURIComponent(base);
            this.logger.debug(`Extracted filename from URL path: ${filename}`);
          }
        }
      } catch (e) {
        this.logger.warn(`Failed to parse URL for filename: ${uploadLink}`, e);
      }
    }

    return filename;
  }

  async process(job: Job<UploadJobData>): Promise<void> {
    this.logger.log(
      `Processing job ${job.id} of type ${job.name} with data ${JSON.stringify(job.data)}`
    );
    const { uploadId } = job.data;

    let upload: Upload | null = null;
    let derivedFilename: string | null = null;

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

      try {
        this.logger.debug(`Attempting to get headers for filename extraction from: ${upload.link}`);
        const headResponse = await axios.head(upload.link, { timeout: 10000 });
        derivedFilename = this.extractFilename(upload.link, headResponse.headers);

        if (derivedFilename && derivedFilename !== upload.fileName) {
          this.logger.log(`Updating filename for upload ${uploadId} to: ${derivedFilename}`);
          await this.uploadsService.update(uploadId, { fileName: derivedFilename }, upload.userId);
          upload.fileName = derivedFilename;
        } else if (!derivedFilename) {
          this.logger.warn(
            `Could not derive filename for upload ${uploadId}. Using original or generated name.`
          );
        }
      } catch (headError) {
        this.logger.error(
          `HEAD request failed for ${upload.link} (uploadId: ${uploadId}). Cannot extract filename. Proceeding with existing/default name. Error: ${headError.message}`
        );
      }
      const finalFilename = derivedFilename || upload.fileName || `upload_${uploadId}`;

      await this.uploadsService.update(
        uploadId,
        { status: UPLOAD_STATUS.PROCESSING },
        upload.userId
      );

      this.logger.debug(`Starting file stream download from: ${upload.link}`);
      const response = await axios({
        method: 'get',
        url: upload.link,
        responseType: 'stream'
      });
      const fileStream = response.data;

      this.logger.debug(
        `Starting file stream upload to storage ${upload.storage.id} with filename: ${finalFilename}`
      );
      await this.storageService.uploadStream({
        stream: fileStream,
        filename: finalFilename,
        storageId: upload.storage.id,
        userId: upload.userId,
        mimetype: response.headers['content-type']
      });

      await this.uploadsService.update(uploadId, { status: UPLOAD_STATUS.SUCCESS }, upload.userId);
      this.logger.log(
        `Successfully processed job ${job.id} for upload ${uploadId} as ${finalFilename}`
      );
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
