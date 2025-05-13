import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'worker_threads';
import { join } from 'path';
import { EventEmitter } from 'events';
import { Readable, PassThrough } from 'stream';
import {
  MemoryMonitorService,
  MemoryThresholds,
  ChunkSizeConfig
} from '../memory-monitor/memory-monitor.service';

@Injectable()
export class TorrentWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TorrentWorkerService.name);
  private worker: Worker | null = null;
  private eventEmitter = new EventEmitter();
  private isWorkerReady = false;
  private activeStreams = new Map<string, { stream: Readable; cleanup: () => void }>();
  private currentChunkSize: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly memoryMonitor: MemoryMonitorService
  ) {
    const config = this.configService.get('memoryMonitor');
    if (!config) {
      throw new Error('Memory monitor configuration not found');
    }
    this.currentChunkSize = config.chunkSize.DEFAULT;
    this.memoryMonitor.startMonitoring(newSize => {
      this.currentChunkSize = newSize;
      // Update highWaterMark for all active streams
      if (this.worker) {
        this.worker.postMessage({
          type: 'UPDATE_CHUNK_SIZE',
          data: {
            chunkSize: newSize
          }
        });
      }
    });
  }

  async onModuleInit() {
    try {
      console.log('[TorrentWorkerService] onModuleInit started');
      await this.initializeWorker();
      console.log('[TorrentWorkerService] onModuleInit completed');
    } catch (error) {
      console.error(
        '[TorrentWorkerService] Failed to initialize torrent worker in onModuleInit:',
        error
      );
      throw error;
    }
  }

  private async initializeWorker() {
    console.log('[TorrentWorkerService] initializeWorker started');
    const workerPath = join(process.cwd(), 'src', 'modules', 'torrent', 'torrent.worker.mjs');
    console.log(`[TorrentWorkerService] Attempting to initialize worker from path: ${workerPath}`);

    this.worker = new Worker(workerPath);
    console.log('[TorrentWorkerService] Worker instance created.');

    this.worker.on('message', message => {
      const { type, data } = message;
      // console.debug(`[TorrentWorkerService] Received worker message: ${type}`, data); // Keep logger for debug level
      this.eventEmitter.emit(type, data);
    });

    this.worker.on('error', error => {
      console.error('[TorrentWorkerService] Worker error event:', error);
      this.eventEmitter.emit('TORRENT_ERROR', { error: error.message });
      this.isWorkerReady = false;
    });

    this.worker.on('exit', code => {
      console.log(`[TorrentWorkerService] Worker exit event with code: ${code}`);
      if (code !== 0) {
        console.error(`[TorrentWorkerService] Worker stopped with non-zero exit code ${code}`);
      }
      this.worker = null;
      this.isWorkerReady = false;
    });

    console.log('[TorrentWorkerService] Attaching Promise for WORKER_READY event.');
    // Wait for worker to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error(
          `[TorrentWorkerService] Worker initialization timed out after 30 seconds for path: ${workerPath}`
        );
        reject(new Error('Worker initialization timeout'));
      }, 30000);

      this.worker!.on('message', message => {
        if (message.type === 'WORKER_READY') {
          console.log('[TorrentWorkerService] WORKER_READY message received.');
          clearTimeout(timeout);
          this.isWorkerReady = true;
          resolve();
        }
      });
    });
    console.log('[TorrentWorkerService] Worker is ready.');
  }

  async addTorrent(magnetURI: string): Promise<{
    name: string;
    infoHash: string;
    files: Array<{ name: string; length: number }>;
  }> {
    if (!this.worker) {
      await this.initializeWorker();
    }

    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const messageHandler = (message: any) => {
        if (message.type === 'TORRENT_ADDED') {
          this.worker?.removeListener('message', messageHandler);
          resolve(message.data);
        } else if (message.type === 'TORRENT_ERROR') {
          this.worker?.removeListener('message', messageHandler);
          reject(new Error(message.error));
        }
      };

      this.worker.on('message', messageHandler);
      this.worker.postMessage({
        type: 'ADD_TORRENT',
        data: {
          magnetURI,
          chunkSize: this.currentChunkSize
        }
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
      highWaterMark: this.currentChunkSize
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
    this.memoryMonitor.stopMonitoring();

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
