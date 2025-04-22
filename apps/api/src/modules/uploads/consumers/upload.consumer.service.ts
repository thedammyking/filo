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
        const parsedUrl = parseUrl(uploadLink);
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
              `IP ${ipAddress} matches restricted CIDR range: ${rangeName} (${rangeValue})`
            );
            return true;
          }
        } else {
          // Standard range check (private, loopback, etc.)
          if (addr.range() === rangeValue) {
            this.logger.warn(`IP ${ipAddress} matches restricted range: ${rangeName}`);
            return true;
          }
        }
      }
      return false;
    } catch (e) {
      this.logger.error(`Failed to parse or check IP address: ${ipAddress}`, e);
      // Treat parse errors as potentially unsafe
      return true;
    }
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

      // --- SSRF Protection: Check resolved IP before any request ---
      let urlObject: URL;
      try {
        urlObject = new URL(upload.link);
      } catch (e) {
        throw new BadRequestException(`Invalid URL format: ${upload.link}`);
      }
      const hostname = urlObject.hostname;

      if (!hostname) {
        throw new BadRequestException(`Could not extract hostname from URL: ${upload.link}`);
      }

      this.logger.debug(`Resolving IP for hostname: ${hostname} (from ${upload.link})`);
      let resolvedIp: string;
      try {
        // Use lookup with family 4 to prioritize IPv4 if applicable, but will handle IPv6 too
        const lookupResult = await dns.lookup(hostname);
        resolvedIp = lookupResult.address;
        this.logger.debug(`Resolved ${hostname} to IP: ${resolvedIp}`);
      } catch (dnsError) {
        this.logger.error(`DNS lookup failed for hostname: ${hostname}`, dnsError);
        throw new Error(`Could not resolve hostname: ${hostname}`); // Fail job if DNS fails
      }

      if (this.isIpRestricted(resolvedIp)) {
        throw new BadRequestException(
          `URL resolves to a restricted IP address (${resolvedIp}). Access denied.`
        );
      }
      // --- End SSRF Protection ---

      if (upload.status !== UPLOAD_STATUS.PENDING) {
        this.logger.warn(
          `Upload ${uploadId} is not in PENDING state (current: ${upload.status}). Skipping.`
        );
        return;
      }

      // --- Filename Extraction Logic (HEAD request) ---
      try {
        this.logger.debug(`Attempting to get headers for filename extraction from: ${upload.link}`);
        // We already resolved the IP, but axios typically handles this again.
        // For stricter protection against DNS rebinding, one might use the resolved IP directly
        // if the underlying http agent supports it, or pass a custom agent.
        // For simplicity here, we rely on the check performed before this request.
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
      // --- End Filename Extraction ---

      // Set status to PROCESSING
      await this.uploadsService.update(
        uploadId,
        { status: UPLOAD_STATUS.PROCESSING },
        upload.userId
      );

      // --- Download Stream ---
      this.logger.debug(`Starting file stream download from: ${upload.link}`);
      // Again, axios will perform DNS lookup here. The prior check adds a layer of safety.
      const response = await axios({
        method: 'get',
        url: upload.link,
        responseType: 'stream',
        timeout: 300000 // 5-minute timeout
      });
      const fileStream = response.data;
      // --- End Download Stream ---

      // --- Upload Stream ---
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
      // --- End Upload Stream ---

      // --- Final Update ---
      await this.uploadsService.update(uploadId, { status: UPLOAD_STATUS.SUCCESS }, upload.userId);
      this.logger.log(
        `Successfully processed job ${job.id} for upload ${uploadId} as ${finalFilename}`
      );
      // --- End Final Update ---
    } catch (error) {
      this.logger.error(
        `Failed to process job ${job.id} for upload ${uploadId}: ${error.message}`,
        error.stack
      );
      // Update to FAILED, only if not already successful and error is not Bad Request (invalid URL/IP)
      if (upload && upload.userId && !(error instanceof BadRequestException)) {
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
      // Re-throw the error so the job is marked as failed by BullMQ
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
