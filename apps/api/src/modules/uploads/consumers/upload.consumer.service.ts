import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { UPLOAD_JOB, UPLOAD_QUEUE } from '@/modules/queue/queue.constants';
import type { UploadJobData } from '@/modules/queue/producers/upload.producer.service';
import { UploadsService } from '../uploads.service';
import { StorageService } from '@/modules/storage/storage.service';
import { UPLOAD_STATUS, UPLOAD_TYPE } from '@filo/libs/constants';
import { Upload } from '../entities/upload.entity';
import { FileService, FileDetails } from '@/modules/file/file.service';
import { SecurityService } from '@/modules/security/security.service';
import { TorrentService } from '@/modules/torrent/torrent.service';

@Injectable()
@Processor(UPLOAD_QUEUE)
export class UploadConsumerService extends WorkerHost {
  private readonly logger = new Logger(UploadConsumerService.name);

  constructor(
    private readonly uploadsService: UploadsService,
    private readonly storageService: StorageService,
    @InjectQueue(UPLOAD_QUEUE) private readonly uploadQueue: Queue,
    private readonly fileService: FileService,
    private readonly securityService: SecurityService,
    private readonly torrentService: TorrentService
  ) {
    super();
    this.logger.log('UploadConsumerService initialized and listening for jobs.');
  }

  // --- Worker Event Listeners ---
  @OnWorkerEvent('active')
  onActive(job: Job<UploadJobData>) {
    this.logger.log(`[Job ${job.id}] Started processing uploadId: ${job.data.uploadId}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<UploadJobData>, result: any) {
    this.logger.log(
      `[Job ${job.id}] Completed processing uploadId: ${job.data.uploadId}. Result: ${JSON.stringify(result)}`
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<UploadJobData> | undefined, error: Error) {
    const jobId = job?.id ?? 'unknown';
    const uploadId = job?.data?.uploadId ?? 'unknown';
    this.logger.error(
      `[Job ${jobId}] Failed processing uploadId: ${uploadId}. Error: ${error.message}`,
      error.stack
    );
    if (job?.data?.uploadId) {
      // Ensure this update doesn't interfere if the error was set within the process method
      // This onFailed listener is a fallback or for errors outside the main try-catch of `process`
      this.uploadsService
        .update(job.data.uploadId, {
          status: UPLOAD_STATUS.FAILED
          // Avoid overwriting a more specific error message if already set
          // error: error.message
        })
        .catch(updateError => {
          this.logger.error(
            `[Job ${jobId}] Failed to update upload status to FAILED for ${uploadId} in onFailed listener: ${updateError.message}`,
            updateError.stack
          );
        });
    }
  }
  // --- End Worker Event Listeners ---

  async process(job: Job<UploadJobData>): Promise<any> {
    const { uploadId } = job.data;
    const logPrefix = `[Job ${job.id}][Upload ${uploadId}]`;
    let upload: Upload | null = null;

    try {
      this.logger.log(`${logPrefix} Fetching upload entity.`);
      upload = await this.uploadsService._internalFindOneById(uploadId);

      if (!upload || !upload.link || !upload.storage?.id || !upload.userId) {
        const missingFields = [
          !upload && 'entity',
          upload && !upload.link && 'link',
          upload && !upload.storage?.id && 'storage.id',
          upload && !upload.userId && 'userId'
        ]
          .filter(Boolean)
          .join(', ');
        const errorMessage = `Upload ${uploadId} not found or missing required data (${missingFields}).`;
        this.logger.error(`${logPrefix} ${errorMessage}`);
        // No need to update to FAILED here, onFailed will be triggered by the throw
        throw new Error(errorMessage);
      }

      const userId = upload.userId;
      const userLogPrefix = `${logPrefix}[User ${userId}]`;

      this.logger.log(
        `${userLogPrefix} Processing upload. Type: ${upload.type}. Link: ${upload.link}. Current status: ${upload.status}`
      );

      // Check if the job should be skipped based on its current status
      if (upload.status !== UPLOAD_STATUS.PENDING && upload.status !== UPLOAD_STATUS.PROCESSING) {
        this.logger.warn(
          `${userLogPrefix} Upload status is ${upload.status} (not PENDING or PROCESSING). Skipping processing.`
        );
        return { skipped: true, reason: `Upload status was ${upload.status}` };
      }

      // If status is PENDING, update to PROCESSING before starting actual work
      if (upload.status === UPLOAD_STATUS.PENDING) {
        this.logger.log(`${userLogPrefix} Updating status from PENDING to PROCESSING.`);
        await this.uploadsService.update(uploadId, {
          status: UPLOAD_STATUS.PROCESSING
        });
        upload.status = UPLOAD_STATUS.PROCESSING; // Update local copy for current execution context
      }

      // At this point, upload.status must be UPLOAD_STATUS.PROCESSING

      switch (upload.type) {
        case UPLOAD_TYPE.FILE:
          this.logger.log(`${userLogPrefix} Starting FILE type processing.`);
          // --- SSRF Protection ---
          this.logger.log(`${userLogPrefix} [SSRF Check] Validating URL: ${upload.link}`);
          await this.securityService.validateUrlSafety(upload.link, userLogPrefix);
          this.logger.log(`${userLogPrefix} [SSRF Check] URL validation successful.`);

          // --- Get File Stream and Filename ---
          this.logger.log(
            `${userLogPrefix} [FileService] Fetching file details from: ${upload.link}`
          );
          const fileDetails: FileDetails = await this.fileService.getFileDetailsFromUrl(
            upload.link,
            userLogPrefix
          );
          this.logger.log(
            `${userLogPrefix} [FileService] Received stream. Derived filename: ${fileDetails.filename}, Content-Type: ${fileDetails.contentType}, Content-Length: ${fileDetails.contentLength}`
          );

          if (fileDetails.filename && fileDetails.filename !== upload.fileName) {
            this.logger.log(
              `${userLogPrefix} [Filename] Updating filename in DB to: ${fileDetails.filename} (was: ${upload.fileName})`
            );
            await this.uploadsService.update(uploadId, {
              fileName: fileDetails.filename
            });
            upload.fileName = fileDetails.filename;
          }

          const finalFilename = upload.fileName || `upload_${uploadId}_${Date.now()}`; // More unique fallback
          if (!upload.fileName && !fileDetails.filename) {
            this.logger.warn(
              `${userLogPrefix} No filename derived or set, using generated fallback: ${finalFilename}`
            );
          }

          // --- Upload to Storage ---
          this.logger.log(
            `${userLogPrefix} Starting stream upload to storage provider for file: ${finalFilename}`
          );

          await this.storageService.uploadStream({
            storageId: upload.storage.id,
            userId: userId,
            stream: fileDetails.stream,
            filename: finalFilename,
            mimetype: fileDetails.contentType
          });

          this.logger.log(`${userLogPrefix} Successfully uploaded ${finalFilename}`);

          await this.uploadsService.update(uploadId, {
            status: UPLOAD_STATUS.SUCCESS,
            fileSize: fileDetails.contentLength,
            error: null
          });

          this.logger.log(`${userLogPrefix} FILE type processing completed successfully.`);
          return { success: true };

        case UPLOAD_TYPE.MAGNET:
          this.logger.log(`${userLogPrefix} Starting MAGNET type processing.`);
          // Delegate to TorrentService
          await this.torrentService.handleMagnetUpload(upload);
          this.logger.log(
            `${userLogPrefix} MAGNET type processing initiated through TorrentService.`
          );
          // The TorrentService will be responsible for updating status internally for its operations.
          // If handleMagnetUpload throws, it will be caught by the main catch block.
          return { success: true, message: 'Torrent processing delegated.' }; // Or a more specific result

        default:
          const unknownTypeErrorMessage = `Unknown upload type: ${upload.type}.`;
          this.logger.error(`${userLogPrefix} ${unknownTypeErrorMessage}`);
          await this.uploadsService.update(uploadId, {
            status: UPLOAD_STATUS.FAILED,
            error: unknownTypeErrorMessage
          });
          throw new Error(unknownTypeErrorMessage);
      }
    } catch (error) {
      this.logger.error(
        `${logPrefix} Error during upload processing (type: ${upload?.type}): ${error.message}`,
        error.stack
      );

      // If upload entity was fetched and not already marked FAILED by type-specific logic
      if (upload && upload.status !== UPLOAD_STATUS.FAILED) {
        try {
          this.logger.log(
            `${logPrefix} Attempting to update upload status to FAILED in main catch. Current status: ${upload.status}, Error: ${error.message}`
          );
          await this.uploadsService.update(uploadId, {
            status: UPLOAD_STATUS.FAILED,
            error: error.message // Capture the specific error message
          });
        } catch (updateError) {
          this.logger.error(
            `${logPrefix} Critical: Failed to update upload status to FAILED after error: ${updateError.message}`,
            updateError.stack
          );
        }
      }
      throw error; // Re-throw to ensure BullMQ handles it as a job failure
    }
  }
}
