import { Injectable, Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mime from 'mime-types';
import { UploadsService } from '@/modules/uploads/uploads.service';
import { StorageService } from '@/modules/storage/storage.service';
import { Upload } from '@/modules/uploads/entities/upload.entity';
import { UPLOAD_STATUS, UPLOAD_TYPE } from '@filo/libs/constants';
import type { CreateUploadDto } from '@/modules/uploads/dto/upload.dto';
import { TorrentWorkerService } from './torrent.worker.service';

@Injectable()
export class TorrentService implements OnModuleInit {
  private readonly logger = new Logger(TorrentService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => UploadsService))
    private readonly uploadsService: UploadsService,
    private readonly storageService: StorageService,
    private readonly torrentWorker: TorrentWorkerService
  ) {}

  async onModuleInit() {
    // Worker initialization is handled by TorrentWorkerService
  }

  private sanitizePath(path: string): string {
    // Basic sanitization: replace problematic characters with underscores
    // Allows alphanumeric, dots, hyphens, underscores, and forward slashes for path structure
    let sanitized = path.replace(/[^a-zA-Z0-9.\-_\/]/g, '_');
    // Prevent path traversal by collapsing multiple dots or slashes
    sanitized = sanitized.replace(/\.\.+/g, '.').replace(/\/\/+/g, '/');
    // Remove leading/trailing slashes or dots to ensure clean component
    return sanitized.replace(/^[/._]+|[/._]+$/g, '');
  }

  private getMimeType(filename: string): string | undefined {
    return mime.lookup(filename) || undefined;
  }

  async handleMagnetUpload(originalUpload: Upload): Promise<void> {
    const { id: originalUploadId, link: magnetURI, userId, storage } = originalUpload;
    const logPrefix = `[Upload ${originalUploadId}][User ${userId}]`;
    this.logger.log(`${logPrefix} Processing magnet: ${magnetURI}`);

    if (!storage || !storage.id) {
      this.logger.error(`${logPrefix} Storage info missing.`);
      await this.uploadsService.update(originalUploadId, {
        status: UPLOAD_STATUS.FAILED,
        error: 'Storage information missing.'
      });
      return;
    }

    try {
      // Update original upload to PROCESSING if not already
      if (originalUpload.status !== UPLOAD_STATUS.PROCESSING) {
        await this.uploadsService.update(originalUploadId, { status: UPLOAD_STATUS.PROCESSING });
      }

      // Add torrent to worker without download path
      const torrentInfo = await this.torrentWorker.addTorrent(magnetURI);
      this.logger.log(
        `${logPrefix} Torrent added: ${torrentInfo.name}, Files: ${torrentInfo.files.length}`
      );

      if (torrentInfo.files.length === 0) {
        this.logger.warn(`${logPrefix} Torrent contains no files.`);
        await this.uploadsService.update(originalUploadId, {
          status: UPLOAD_STATUS.FAILED,
          error: 'Torrent contains no files.'
        });
        return;
      }

      let torrentNameForSubdirectory = torrentInfo.name;
      if (!torrentNameForSubdirectory && torrentInfo.files.length > 0) {
        const largestFile = [...torrentInfo.files].sort((a, b) => b.length - a.length)[0];
        torrentNameForSubdirectory =
          largestFile.name.split('/').pop().split('.').slice(0, -1).join('.') ||
          largestFile.name.split('/').pop() ||
          `torrent_${originalUploadId}`;
      } else if (!torrentNameForSubdirectory) {
        torrentNameForSubdirectory = `torrent_${originalUploadId}`;
      }
      torrentNameForSubdirectory = this.sanitizePath(torrentNameForSubdirectory);
      this.logger.log(`${logPrefix} Subdirectory name: ${torrentNameForSubdirectory}`);

      // Mark original magnet upload as successfully parsed and initiating children
      await this.uploadsService.update(originalUploadId, {
        status: UPLOAD_STATUS.SUCCESS,
        fileName: torrentInfo.name || torrentNameForSubdirectory,
        fileSize: torrentInfo.files.reduce((sum, file) => sum + file.length, 0),
        error: null
      });

      // Process each file as a separate upload
      for (let i = 0; i < torrentInfo.files.length; i++) {
        const file = torrentInfo.files[i];
        const fileLogPrefix = `${logPrefix}[File:${file.name}]`;
        this.logger.log(`${fileLogPrefix} Creating upload entry. Size: ${file.length}`);

        let individualFileuploadRecord: Upload | null = null;
        try {
          const createLinkDto = {
            link: magnetURI,
            type: UPLOAD_TYPE.MAGNET,
            fileName: file.name
          };
          const createUploadDto: CreateUploadDto = {
            storageId: storage.id,
            links: [createLinkDto]
          };

          const savedUploads = await this.uploadsService.createUploads(createUploadDto, userId);
          if (!savedUploads || savedUploads.length === 0) {
            throw new Error('Failed to create database entry for torrent file.');
          }
          individualFileuploadRecord = savedUploads[0];
          this.logger.log(
            `${fileLogPrefix} DB record created: ${individualFileuploadRecord.id}, status: ${individualFileuploadRecord.status}`
          );

          await this.uploadsService.update(individualFileuploadRecord.id, {
            status: UPLOAD_STATUS.PROCESSING
          });

          // Get file stream from worker
          const fileStream = await this.torrentWorker.getFileStream(torrentInfo.infoHash, i);

          this.logger.log(
            `${fileLogPrefix} Uploading to storage. Subdir: ${torrentNameForSubdirectory}`
          );
          await this.storageService.uploadStream({
            storageId: storage.id,
            userId: userId,
            stream: fileStream,
            filename: file.name,
            mimetype: this.getMimeType(file.name),
            subdirectory: torrentNameForSubdirectory,
            fileSize: file.length
          });

          this.logger.log(`${fileLogPrefix} Upload successful.`);
          await this.uploadsService.update(individualFileuploadRecord.id, {
            status: UPLOAD_STATUS.SUCCESS,
            completedAt: new Date(),
            fileSize: file.length,
            error: null
          });
        } catch (error) {
          this.logger.error(
            `${fileLogPrefix} Failed: ${error instanceof Error ? error.message : String(error)}`,
            error instanceof Error ? error.stack : undefined
          );
          if (individualFileuploadRecord && individualFileuploadRecord.id) {
            await this.uploadsService.update(individualFileuploadRecord.id, {
              status: UPLOAD_STATUS.FAILED,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }

      // Clean up the torrent
      await this.torrentWorker.removeTorrent(torrentInfo.infoHash);
      this.logger.log(`${logPrefix} Torrent processing completed successfully`);
    } catch (error) {
      this.logger.error(
        `${logPrefix} Overall failure: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      await this.uploadsService.update(originalUploadId, {
        status: UPLOAD_STATUS.FAILED,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
