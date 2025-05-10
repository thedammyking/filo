import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'worker_threads';
import { join } from 'path';
import { EventEmitter } from 'events';

@Injectable()
export class TorrentWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TorrentWorkerService.name);
  private worker: Worker | null = null;
  private eventEmitter = new EventEmitter();

  async onModuleInit() {
    try {
      await this.initializeWorker();
    } catch (error) {
      this.logger.error('Failed to initialize torrent worker:', error);
      throw error;
    }
  }

  private async initializeWorker() {
    const workerPath = join(__dirname, 'torrent.worker.mjs');
    this.worker = new Worker(workerPath);

    this.worker.on('message', message => {
      const { type, data } = message;
      this.eventEmitter.emit(type, data);
    });

    this.worker.on('error', error => {
      this.logger.error('Worker error:', error);
      this.eventEmitter.emit('ERROR', { error: error.message });
    });

    this.worker.on('exit', code => {
      if (code !== 0) {
        this.logger.error(`Worker stopped with exit code ${code}`);
      }
      this.worker = null;
    });
  }

  async addTorrent(
    magnetURI: string,
    downloadPath?: string
  ): Promise<{
    name: string;
    infoHash: string;
    files: Array<{ name: string; length: number }>;
  }> {
    if (!this.worker) {
      throw new Error('Torrent worker not initialized');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.eventEmitter.removeAllListeners('TORRENT_READY');
        this.eventEmitter.removeAllListeners('TORRENT_ERROR');
        reject(new Error('Torrent add operation timed out'));
      }, 30000); // 30 second timeout

      this.eventEmitter.once('TORRENT_READY', data => {
        clearTimeout(timeout);
        resolve(data);
      });

      this.eventEmitter.once('TORRENT_ERROR', data => {
        clearTimeout(timeout);
        reject(new Error(data.error));
      });

      this.worker!.postMessage({
        type: 'ADD_TORRENT',
        data: { magnetURI, downloadPath }
      });
    });
  }

  async getFileStream(infoHash: string, fileIndex: number): Promise<NodeJS.ReadableStream> {
    if (!this.worker) {
      throw new Error('Torrent worker not initialized');
    }

    const stream = new EventEmitter();
    let isEnded = false;

    this.eventEmitter.on('FILE_CHUNK', data => {
      if (data.infoHash === infoHash && data.fileIndex === fileIndex) {
        stream.emit('data', Buffer.from(data.chunk));
      }
    });

    this.eventEmitter.on('FILE_END', data => {
      if (data.infoHash === infoHash && data.fileIndex === fileIndex) {
        isEnded = true;
        stream.emit('end');
      }
    });

    this.eventEmitter.on('FILE_ERROR', data => {
      if (data.infoHash === infoHash && data.fileIndex === fileIndex) {
        stream.emit('error', new Error(data.error));
      }
    });

    this.worker.postMessage({
      type: 'GET_FILE_STREAM',
      data: { infoHash, fileIndex }
    });

    return stream as unknown as NodeJS.ReadableStream;
  }

  async removeTorrent(infoHash: string): Promise<void> {
    if (!this.worker) {
      throw new Error('Torrent worker not initialized');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.eventEmitter.removeAllListeners('TORRENT_REMOVED');
        this.eventEmitter.removeAllListeners('REMOVE_ERROR');
        reject(new Error('Torrent remove operation timed out'));
      }, 5000); // 5 second timeout

      this.eventEmitter.once('TORRENT_REMOVED', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.eventEmitter.once('REMOVE_ERROR', data => {
        clearTimeout(timeout);
        reject(new Error(data.error));
      });

      this.worker!.postMessage({
        type: 'REMOVE_TORRENT',
        data: { infoHash }
      });
    });
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
