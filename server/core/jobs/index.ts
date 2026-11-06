import crypto from 'crypto';
import { logger } from '../logger/index.ts';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface Job<TData = unknown, TResult = unknown> {
  id: string;
  type: string;
  data: TData;
  status: JobStatus;
  progress: number;
  result?: TResult;
  error?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
}

export type JobHandler<TData = unknown, TResult = unknown> = (data: TData) => Promise<TResult>;

export interface IJobQueue {
  enqueue<TData, TResult>(type: string, data: TData, options?: { maxAttempts?: number }): Promise<Job<TData, TResult>>;
  getJob<TData, TResult>(id: string): Job<TData, TResult> | undefined;
  registerHandler<TData, TResult>(type: string, handler: JobHandler<TData, TResult>): void;
}

export class InMemoryJobQueue implements IJobQueue {
  private jobs: Map<string, Job<any, any>> = new Map();
  private handlers: Map<string, JobHandler<any, any>> = new Map();

  public registerHandler<TData, TResult>(type: string, handler: JobHandler<TData, TResult>): void {
    this.handlers.set(type, handler);
    logger.info(`Registered background job handler for: ${type}`);
  }

  public async enqueue<TData, TResult>(
    type: string,
    data: TData,
    options?: { maxAttempts?: number }
  ): Promise<Job<TData, TResult>> {
    const id = `job-${crypto.randomUUID()}`;
    const job: Job<TData, TResult> = {
      id,
      type,
      data,
      status: 'queued',
      progress: 0,
      attempts: 0,
      maxAttempts: options?.maxAttempts || 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.jobs.set(id, job);
    logger.info(`Enqueued background job ${id} [type: ${type}]`);

    // Process asynchronously on the next event loop tick
    setImmediate(() => this.processNext(job));

    return job;
  }

  public getJob<TData, TResult>(id: string): Job<TData, TResult> | undefined {
    return this.jobs.get(id);
  }

  private async processNext(job: Job<any, any>): Promise<void> {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      job.status = 'failed';
      job.error = `No job worker registered for type '${job.type}'`;
      job.updatedAt = new Date().toISOString();
      logger.error(job.error, { jobId: job.id });
      return;
    }

    job.status = 'processing';
    job.attempts++;
    job.updatedAt = new Date().toISOString();

    try {
      logger.info(`Processing job ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`);
      const result = await handler(job.data);
      job.status = 'completed';
      job.progress = 100;
      job.result = result;
      job.updatedAt = new Date().toISOString();
      logger.info(`Completed job ${job.id} successfully`);
    } catch (err: any) {
      logger.error(`Job ${job.id} failed on attempt ${job.attempts}`, { error: err.message });
      if (job.attempts < job.maxAttempts) {
        // Retry with backoff
        setTimeout(() => this.processNext(job), 1000 * job.attempts);
      } else {
        job.status = 'failed';
        job.error = err.message || 'Unknown processing error';
        job.updatedAt = new Date().toISOString();
      }
    }
  }
}

export const jobQueue: IJobQueue = new InMemoryJobQueue();

