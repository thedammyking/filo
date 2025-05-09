import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { parse as parseUrl } from 'url';
import { basename } from 'path';
import contentDisposition from 'content-disposition';
import { Readable } from 'stream';

export interface FileDetails {
  stream: Readable;
  filename: string | null;
  contentType: string | null;
  contentLength: number | null;
}

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  private extractFilenameFromHeaders(link: string, headers: any): string | null {
    let filename: string | undefined;
    const dispositionHeader = headers['content-disposition'];

    if (dispositionHeader) {
      try {
        const disposition = contentDisposition.parse(dispositionHeader);
        if (disposition.parameters && disposition.parameters.filename) {
          filename = disposition.parameters.filename;
          this.logger.debug(
            `[Filename] Extracted filename from Content-Disposition: ${filename} (Link: ${link})`
          );
        }
      } catch (e) {
        this.logger.warn(
          `[Filename] Failed to parse Content-Disposition header: ${dispositionHeader} (Link: ${link})`,
          e.stack
        );
      }
    }
    return filename || null;
  }

  private extractFilenameFromUrl(link: string): string | null {
    try {
      const parsedUrlPath = parseUrl(link).pathname;
      if (parsedUrlPath) {
        const base = basename(parsedUrlPath);
        if (base && base !== '/' && base.includes('.')) {
          const decodedFilename = decodeURIComponent(base);
          this.logger.debug(
            `[Filename] Extracted filename from URL path: ${decodedFilename} (Link: ${link})`
          );
          return decodedFilename;
        }
      }
    } catch (e) {
      this.logger.warn(`[Filename] Failed to parse URL for filename: ${link}`, e.stack);
    }
    return null;
  }

  /**
   * Fetches file details (including stream, filename, content type, and content length)
   * from a given URL.
   * It first attempts a HEAD request to get headers for filename and metadata,
   * then a GET request for the stream.
   * @param url The URL of the file to fetch.
   * @param logContext Optional context for logging.
   * @returns Promise<FileDetails>
   */
  async getFileDetailsFromUrl(url: string, logContext?: string): Promise<FileDetails> {
    const prefix = logContext ? `${logContext} ` : '';
    let filename: string | null = null;
    let contentType: string | null = null;
    let contentLength: number | null = null;

    try {
      this.logger.log(`${prefix}[FileService] Attempting HEAD request to: ${url}`);
      const headResponse = await axios.head(url, { timeout: 10000 }); // 10s timeout
      this.logger.debug(
        `${prefix}[FileService] HEAD request successful. Headers: ${JSON.stringify(headResponse.headers)}`
      );

      filename = this.extractFilenameFromHeaders(url, headResponse.headers);
      contentType = headResponse.headers['content-type'] || null;
      const cl = headResponse.headers['content-length'];
      if (cl && !isNaN(Number(cl))) {
        contentLength = Number(cl);
      }
    } catch (error) {
      this.logger.warn(
        `${prefix}[FileService] HEAD request to ${url} failed or timed out. Will try to extract filename from URL path if needed. Error: ${error.message}`
      );
      // If HEAD fails, we can still try to get filename from URL path later
      // and proceed to GET the stream.
    }

    // If filename wasn't found from headers, try extracting from URL path
    if (!filename) {
      filename = this.extractFilenameFromUrl(url);
    }

    try {
      this.logger.log(`${prefix}[FileService] Attempting GET request (stream) to: ${url}`);
      const getResponse = await axios.get<Readable>(url, {
        responseType: 'stream',
        timeout: 300000 // 5 minutes timeout for GET request to start streaming
      });
      this.logger.log(`${prefix}[FileService] GET request for stream to ${url} successful.`);

      // Update content type & length from GET response if not available from HEAD
      if (!contentType) {
        contentType = getResponse.headers['content-type'] || null;
      }
      if (contentLength === null) {
        const cl = getResponse.headers['content-length'];
        if (cl && !isNaN(Number(cl))) {
          contentLength = Number(cl);
        }
      }

      return {
        stream: getResponse.data,
        filename,
        contentType,
        contentLength
      };
    } catch (error) {
      this.logger.error(
        `${prefix}[FileService] Failed to GET file stream from ${url}: ${error.message}`,
        error.stack
      );
      if (axios.isAxiosError(error)) {
        throw new BadRequestException(`Failed to download file from URL: ${error.message}`);
      }
      throw new Error(`Failed to get file stream from ${url}.`);
    }
  }
}
