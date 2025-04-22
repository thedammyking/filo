import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { UPLOAD_JOB, UPLOAD_QUEUE } from '@/queue/queue.constants';
import type { UploadJobData } from '@/queue/producers/upload.producer.service';
import { UploadsService } from '../uploads.service';
import { StorageService } from '@/modules/storage/storage.service';
import axios from 'axios';
import { UPLOAD_STATUS } from '@filo/libs/constants';
import { Upload } from '../entities/upload.entity';
import { parse as parseUrl, URL } from 'url';
import { basename } from 'path';
import contentDisposition from 'content-disposition';
import { promises as dns } from 'dns';
import * as ipaddr from 'ipaddr.js';

// Define restricted IP ranges
const RESTRICTED_IP_RANGES: { [key: string]: string } = {
  // Standard private ranges
  private: 'private',
  loopback: 'loopback',
  // Carrier-Grade NAT
  carrierGradeNat: '100.64.0.0/10',
  // Link-local
  linkLocal: 'linkLocal',
  // Reserved
  reserved: 'reserved',
  // Cloud Metadata Services (common ones)
  awsMetadata: '169.254.169.254/32',
  gcpMetadata: '169.254.169.254/32', // Same IP used by GCP/Azure/etc.
  aliyunMetadata: '100.100.100.200/32'
};

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
    this.logger.log('UploadConsumerService initialized and listening for jobs.');
  }

  // --- Worker Event Listeners ---
  @OnWorkerEvent('active')
  onActive(job: Job<UploadJobData>) {
    this.logger.log(
      `[Job ${job.id}] Started processing uploadId: ${job.data.uploadId}` // More concise log
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<UploadJobData>, result: any) {
    this.logger.log(
      `[Job ${job.id}] Completed processing uploadId: ${job.data.uploadId}. Result: ${JSON.stringify(result)}`
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<UploadJobData> | undefined, error: Error) {
    // Job might be undefined if failure happens before job processing starts (e.g., connection issues)
    const jobId = job?.id ?? 'unknown';
    const uploadId = job?.data?.uploadId ?? 'unknown';
    this.logger.error(
      `[Job ${jobId}] Failed processing uploadId: ${uploadId}. Error: ${error.message}`,
      error.stack
    );
  }
  // --- End Worker Event Listeners ---

  private extractFilename(uploadLink: string, headers: any): string {
    let filename: string | undefined;

    const dispositionHeader = headers['content-disposition'];
    if (dispositionHeader) {
      try {
        const disposition = contentDisposition.parse(dispositionHeader);
        if (disposition.parameters && disposition.parameters.filename) {
          filename = disposition.parameters.filename;
          this.logger.debug(
            `[Filename] Extracted filename from Content-Disposition: ${filename} (Link: ${uploadLink})`
          );
        }
      } catch (e) {
        this.logger.warn(
          `[Filename] Failed to parse Content-Disposition header: ${dispositionHeader} (Link: ${uploadLink})`,
          e.stack
        );
      }
    }

    if (!filename) {
      try {
        const parsedUrl = parseUrl(uploadLink);
        if (parsedUrl.pathname) {
          const base = basename(parsedUrl.pathname);
          if (base && base !== '/' && base.includes('.')) {
            filename = decodeURIComponent(base);
            this.logger.debug(
              `[Filename] Extracted filename from URL path: ${filename} (Link: ${uploadLink})`
            );
          }
        }
      } catch (e) {
        this.logger.warn(`[Filename] Failed to parse URL for filename: ${uploadLink}`, e.stack);
      }
    }

    return filename;
  }

  /**
   * Checks if a given IP address falls into restricted ranges.
   */
  private isIpRestricted(ipAddress: string): boolean {
    try {
      const addr = ipaddr.parse(ipAddress);

      // Check against common restricted ranges using ipaddr.js
      for (const rangeName in RESTRICTED_IP_RANGES) {
        const rangeValue = RESTRICTED_IP_RANGES[rangeName];
        if (rangeValue.includes('/')) {
          // CIDR range check
          const subnet = ipaddr.parseCIDR(rangeValue);
          if (addr.match(subnet)) {
            this.logger.warn(
              `[SSRF Check] IP ${ipAddress} matches restricted CIDR range: ${rangeName} (${rangeValue})`
            );
            return true;
          }
        } else {
          // Standard range check (private, loopback, etc.)
          if (addr.range() === rangeValue) {
            this.logger.warn(`[SSRF Check] IP ${ipAddress} matches restricted range: ${rangeName}`);
            return true;
          }
        }
      }
      return false;
    } catch (e) {
      this.logger.error(`[SSRF Check] Failed to parse or check IP address: ${ipAddress}`, e.stack);
      // Treat parse errors as potentially unsafe
      return true;
    }
  }

  async process(job: Job<UploadJobData>): Promise<any> {
    // Return value can be used in onCompleted
    // `onActive` logs job start
    const { uploadId } = job.data;
    const logPrefix = `[Job ${job.id}][Upload ${uploadId}]`; // Consistent prefix for logs within this job

    let upload: Upload | null = null;
    let derivedFilename: string | null = null;

    try {
      this.logger.log(`${logPrefix} Fetching upload entity.`);
      upload = await this.uploadsService._internalFindOneById(uploadId);

      if (!upload || !upload.link || !upload.storage?.id || !upload.userId) {
        // Log specific missing field if possible
        const missingFields = [
          !upload && 'entity',
          upload && !upload.link && 'link',
          upload && !upload.storage?.id && 'storage.id',
          upload && !upload.userId && 'userId'
        ]
          .filter(Boolean)
          .join(', ');
        this.logger.error(
          `${logPrefix} Upload not found or missing required data: ${missingFields}.`
        );
        throw new Error(
          `Upload ${uploadId} not found or missing required data (${missingFields}). Failing job.`
        );
      }
      const userId = upload.userId; // For convenience
      const userLogPrefix = `${logPrefix}[User ${userId}]`; // Add user context

      this.logger.log(`${userLogPrefix} Found upload entity. Link: ${upload.link}`);

      // --- SSRF Protection: Check resolved IP before any request ---
      let urlObject: URL;
      try {
        urlObject = new URL(upload.link);
      } catch (e) {
        throw new BadRequestException(`Invalid URL format: ${upload.link}`);
      }
      const hostname = urlObject.hostname;

      if (!hostname) {
        this.logger.error(`${userLogPrefix} Could not extract hostname from URL: ${upload.link}`);
        throw new BadRequestException(`Could not extract hostname from URL: ${upload.link}`);
      }

      this.logger.log(`${userLogPrefix} [SSRF Check] Resolving IP for hostname: ${hostname}`);
      let resolvedIp: string;
      try {
        // Use lookup with family 4 to prioritize IPv4 if applicable, but will handle IPv6 too
        const lookupResult = await dns.lookup(hostname);
        resolvedIp = lookupResult.address;
        this.logger.log(`${userLogPrefix} [SSRF Check] Resolved ${hostname} to IP: ${resolvedIp}`);
      } catch (dnsError) {
        this.logger.error(
          `${userLogPrefix} [SSRF Check] DNS lookup failed for hostname: ${hostname}`,
          dnsError.stack
        );
        throw new Error(`Could not resolve hostname: ${hostname}`);
      }

      if (this.isIpRestricted(resolvedIp)) {
        this.logger.error(
          `${userLogPrefix} [SSRF Check] URL resolves to a restricted IP address (${resolvedIp}). Access denied.`
        );
        throw new BadRequestException(
          `URL resolves to a restricted IP address (${resolvedIp}). Access denied.`
        );
      }
      this.logger.log(
        `${userLogPrefix} [SSRF Check] IP ${resolvedIp} is not restricted. Proceeding.`
      );
      // --- End SSRF Protection ---

      if (upload.status !== UPLOAD_STATUS.PENDING) {
        this.logger.warn(
          `${userLogPrefix} Upload is not in PENDING state (current: ${upload.status}). Skipping processing.`
        );
        return { skipped: true, reason: 'Not in PENDING state' }; // Return result
      }

      // --- Filename Extraction Logic (HEAD request) ---
      try {
        this.logger.log(
          `${userLogPrefix} [Filename] Attempting HEAD request for filename extraction from: ${upload.link}`
        );
        const headResponse = await axios.head(upload.link, { timeout: 10000 });
        derivedFilename = this.extractFilename(upload.link, headResponse.headers);

        if (derivedFilename && derivedFilename !== upload.fileName) {
          this.logger.log(
            `${userLogPrefix} [Filename] Updating filename in DB to: ${derivedFilename}`
          );
          // Use internal update without userId check
          await this.uploadsService.update(uploadId, { fileName: derivedFilename });
          upload.fileName = derivedFilename; // Update local copy
        } else if (!derivedFilename) {
          this.logger.warn(
            `${userLogPrefix} [Filename] Could not derive filename. Using original or generated name: ${upload.fileName || '(none)'}`
          );
        }
      } catch (headError) {
        this.logger.error(
          `${userLogPrefix} [Filename] HEAD request failed. Cannot extract filename. Proceeding with existing/default name. Error: ${headError.message}`
        );
        // Log only error message, stack might be too verbose here unless debug level
      }
      const finalFilename = derivedFilename || upload.fileName || `upload_${uploadId}`;
      this.logger.log(`${userLogPrefix} [Filename] Using final filename: ${finalFilename}`);
      // --- End Filename Extraction ---

      // Set status to PROCESSING
      this.logger.log(`${userLogPrefix} Updating status to PROCESSING.`);
      await this.uploadsService.update(
        uploadId,
        { status: UPLOAD_STATUS.PROCESSING }
        // No userId needed for internal update triggered by consumer
      );

      // --- Download Stream ---
      this.logger.log(
        `${userLogPrefix} [Download] Starting file stream download from: ${upload.link}`
      );
      const response = await axios({
        method: 'get',
        url: upload.link,
        responseType: 'stream',
        timeout: 300000 // 5-minute timeout
      });
      const fileStream = response.data;
      this.logger.log(`${userLogPrefix} [Download] File stream download initiated successfully.`);
      // --- End Download Stream ---

      // --- Upload Stream ---
      this.logger.log(
        `${userLogPrefix} [Upload] Starting file stream upload to storage ${upload.storage.id} with filename: ${finalFilename}`
      );
      const uploadResult = await this.storageService.uploadStream({
        stream: fileStream,
        filename: finalFilename,
        storageId: upload.storage.id,
        userId: upload.userId,
        mimetype: response.headers['content-type']
      });
      this.logger.log(
        `${userLogPrefix} [Upload] File stream upload completed successfully. Result: ${JSON.stringify(uploadResult)}`
      );
      // --- End Upload Stream ---

      // --- Final Update ---
      this.logger.log(`${userLogPrefix} Updating status to SUCCESS.`);
      await this.uploadsService.update(uploadId, { status: UPLOAD_STATUS.SUCCESS });
      this.logger.log(`${userLogPrefix} Job completed successfully.`);
      // --- End Final Update ---
      return { success: true, filename: finalFilename }; // Return result
    } catch (error) {
      const userCtx = upload?.userId ? `[User ${upload.userId}]` : '';
      this.logger.error(`${logPrefix}${userCtx} Processing failed: ${error.message}`, error.stack);
      // Update to FAILED, only if upload was fetched and error is not Bad Request
      if (upload && upload.userId && !(error instanceof BadRequestException)) {
        this.logger.log(`${logPrefix}${userCtx} Attempting to update status to FAILED.`);
        const currentUpload = await this.uploadsService._internalFindOneById(uploadId); // Re-fetch to be sure
        if (currentUpload && currentUpload.status !== UPLOAD_STATUS.SUCCESS) {
          try {
            await this.uploadsService.update(uploadId, { status: UPLOAD_STATUS.FAILED });
            this.logger.log(`${logPrefix}${userCtx} Status updated to FAILED.`);
          } catch (updateError) {
            this.logger.error(
              `${logPrefix}${userCtx} Failed to update status to FAILED: ${updateError.message}`,
              updateError.stack
            );
          }
        }
      }
      // Rethrow the original error to mark the job as failed in BullMQ
      throw error;
    }
  }
}
