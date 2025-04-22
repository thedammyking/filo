import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { UPLOAD_JOB, UPLOAD_QUEUE } from '../queue.constants';

export interface UploadJobData {
  uploadId: string;
}

@Injectable()
export class UploadProducerService {
  constructor(@InjectQueue(UPLOAD_QUEUE) private readonly uploadQueue: Queue) {}

  async addUploadJob(data: UploadJobData): Promise<void> {
    await this.uploadQueue.add(UPLOAD_JOB, data);
  }

  async addMultipleUploadJobs(data: UploadJobData[]): Promise<void> {
    const jobs = data.map(jobData => ({ name: UPLOAD_JOB, data: jobData }));
    await this.uploadQueue.addBulk(jobs);
  }
}
