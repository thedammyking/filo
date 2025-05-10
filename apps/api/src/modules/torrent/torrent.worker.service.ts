import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'worker_threads';
import { join } from 'path';
import { EventEmitter } from 'events';
import { Readable, PassThrough } from 'stream';

const CHUNK_SIZE = 64 * 1024; // 64KB chunks

@Injectable()
export class TorrentWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TorrentWorkerService.name);
  private worker: Worker | null = null;
  private eventEmitter = new EventEmitter();
  private isWorkerReady = false;
  private activeStreams = new Map<string, { stream: Readable; cleanup: () => void }>();

  async onModuleInit() {
    try {
      await this.initializeWorker();
    } catch (error) {
      this.logger.error('Failed to initialize torrent worker:', error);
      throw error;
    }
  }

  private async initializeWorker() {
    const workerPath = join(process.cwd(), 'src', 'modules', 'torrent', 'torrent.worker.mjs');
    this.logger.log(`Initializing worker at path: ${workerPath}`);

    this.worker = new Worker(workerPath);

    this.worker.on('message', message => {
      const { type, data } = message;
      this.logger.debug(`Received worker message: ${type}`, data);
      this.eventEmitter.emit(type, data);
    });

    this.worker.on('error', error => {
      this.logger.error('Worker error:', error);
      this.eventEmitter.emit('ERROR', { error: error.message });
      this.isWorkerReady = false;
    });

    this.worker.on('exit', code => {
      if (code !== 0) {
        this.logger.error(`Worker stopped with exit code ${code}`);
      }
      this.worker = null;
      this.isWorkerReady = false;
    });

    // Wait for worker to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker initialization timeout'));
      }, 5000);

      this.worker!.on('message', message => {
        if (message.type === 'WORKER_READY') {
          clearTimeout(timeout);
          this.isWorkerReady = true;
          resolve();
        }
      });
    });
  }

  async addTorrent(magnetURI: string): Promise<{
    name: string;
    infoHash: string;
    files: Array<{ name: string; length: number }>;
  }> {
    if (!this.worker || !this.isWorkerReady) {
      throw new Error('Torrent worker not initialized or not ready');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.eventEmitter.removeAllListeners('TORRENT_READY');
        this.eventEmitter.removeAllListeners('TORRENT_ERROR');
        reject(new Error('Torrent add operation timed out'));
      }, 60000); // 60 second timeout

      const readyHandler = (data: any) => {
        clearTimeout(timeout);
        this.logger.log(`Torrent ready: ${data.name}`);
        this.eventEmitter.removeListener('TORRENT_ERROR', errorHandler);
        resolve(data);
      };

      const errorHandler = (data: any) => {
        clearTimeout(timeout);
        this.logger.error(`Torrent error: ${data.error}`);
        this.eventEmitter.removeListener('TORRENT_READY', readyHandler);
        reject(new Error(data.error));
      };

      this.eventEmitter.once('TORRENT_READY', readyHandler);
      this.eventEmitter.once('TORRENT_ERROR', errorHandler);

      this.logger.log(`Sending ADD_TORRENT message for: ${magnetURI}`);
      this.worker!.postMessage({
        type: 'ADD_TORRENT',
        data: { magnetURI }
      });
    });
  }

  async getFileStream(infoHash: string, fileIndex: number): Promise<NodeJS.ReadableStream> {
    if (!this.worker || !this.isWorkerReady) {
      throw new Error('Torrent worker not initialized or not ready');
    }

    const streamKey = `${infoHash}:${fileIndex}`;
    if (this.activeStreams.has(streamKey)) {
      return this.activeStreams.get(streamKey)!.stream;
    }

    this.logger.log(`Creating stream for ${streamKey}`);

    const passThrough = new PassThrough({
      highWaterMark: CHUNK_SIZE
    });

    let isPaused = false;
    let isEnded = false;

    const cleanup = () => {
      this.logger.log(`Cleaning up stream for ${streamKey}`);
      this.eventEmitter.removeAllListeners('FILE_CHUNK');
      this.eventEmitter.removeAllListeners('FILE_END');
      this.eventEmitter.removeAllListeners('FILE_ERROR');
      this.activeStreams.delete(streamKey);
    };

    // Handle file chunks
    this.eventEmitter.on('FILE_CHUNK', (data: any) => {
      if (data.infoHash === infoHash && data.fileIndex === fileIndex) {
        this.logger.debug(`Received chunk for ${streamKey}, size: ${data.chunk.length}`);

        if (!isPaused && !isEnded) {
          try {
            const canContinue = passThrough.write(data.chunk);
            if (!canContinue) {
              isPaused = true;
              this.worker!.postMessage({
                type: 'PAUSE_STREAM',
                data: { infoHash, fileIndex }
              });
            }
          } catch (error) {
            this.logger.error(`Error writing chunk for ${streamKey}:`, error);
            passThrough.destroy(error);
            cleanup();
          }
        }
      }
    });

    // Handle stream end
    this.eventEmitter.on('FILE_END', (data: any) => {
      if (data.infoHash === infoHash && data.fileIndex === fileIndex) {
        this.logger.log(`Stream ended for ${streamKey}`);
        isEnded = true;
        passThrough.end();
        cleanup();
      }
    });

    // Handle stream errors
    this.eventEmitter.on('FILE_ERROR', (data: any) => {
      if (data.infoHash === infoHash && data.fileIndex === fileIndex) {
        this.logger.error(`Stream error for ${streamKey}: ${data.error}`);
        passThrough.destroy(new Error(data.error));
        cleanup();
      }
    });

    // Handle backpressure
    passThrough.on('drain', () => {
      this.logger.debug(`Stream drained for ${streamKey}, resuming`);
      isPaused = false;
      this.worker!.postMessage({
        type: 'RESUME_STREAM',
        data: { infoHash, fileIndex }
      });
    });

    this.activeStreams.set(streamKey, { stream: passThrough, cleanup });

    this.logger.log(`Requesting file stream for ${streamKey}`);
    this.worker.postMessage({
      type: 'GET_FILE_STREAM',
      data: { infoHash, fileIndex }
    });

    return passThrough;
  }

  async removeTorrent(infoHash: string): Promise<void> {
    if (!this.worker || !this.isWorkerReady) {
      throw new Error('Torrent worker not initialized or not ready');
    }

    // Cancel any active streams for this torrent
    for (const [streamKey, { cleanup }] of this.activeStreams.entries()) {
      if (streamKey.startsWith(infoHash)) {
        this.logger.log(`Cancelling stream for ${streamKey}`);
        cleanup();
      }
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.eventEmitter.removeAllListeners('TORRENT_REMOVED');
        this.eventEmitter.removeAllListeners('REMOVE_ERROR');
        reject(new Error('Torrent remove operation timed out'));
      }, 5000);

      const removedHandler = () => {
        clearTimeout(timeout);
        this.eventEmitter.removeListener('REMOVE_ERROR', errorHandler);
        this.logger.log(`Torrent ${infoHash} removed successfully`);
        resolve();
      };

      const errorHandler = (data: any) => {
        clearTimeout(timeout);
        this.eventEmitter.removeListener('TORRENT_REMOVED', removedHandler);
        this.logger.error(`Failed to remove torrent ${infoHash}: ${data.error}`);
        reject(new Error(data.error));
      };

      this.eventEmitter.once('TORRENT_REMOVED', removedHandler);
      this.eventEmitter.once('REMOVE_ERROR', errorHandler);

      this.logger.log(`Sending REMOVE_TORRENT message for ${infoHash}`);
      this.worker!.postMessage({
        type: 'REMOVE_TORRENT',
        data: { infoHash }
      });
    });
  }

  async onModuleDestroy() {
    // Cancel all active streams
    for (const [streamKey, { cleanup }] of this.activeStreams.entries()) {
      this.logger.log(`Cleaning up stream for ${streamKey} during shutdown`);
      cleanup();
    }
    this.activeStreams.clear();

    if (this.worker) {
      this.logger.log('Terminating worker');
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
