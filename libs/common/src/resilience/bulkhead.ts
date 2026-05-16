import { HttpException, HttpStatus } from '@nestjs/common';

export interface BulkheadOptions {
  /** Name for logging/metrics. */
  name: string;
  /** Max concurrent executions. Default: 20 */
  maxConcurrent?: number;
  /** Max queued executions waiting for a slot. Default: 50 */
  maxQueue?: number;
}

/**
 * Semaphore-based bulkhead for resource isolation.
 *
 * Prevents a slow downstream service from exhausting the entire
 * connection pool / event loop, isolating each service's concurrency.
 *
 * Usage:
 *   const bulkhead = new Bulkhead({ name: 'upload-service', maxConcurrent: 10 });
 *   const result = await bulkhead.execute(() => fetch(url));
 */
export class Bulkhead {
  private activeCount = 0;
  private queueSize = 0;
  private readonly waitQueue: Array<{
    resolve: () => void;
    reject: (err: Error) => void;
  }> = [];

  private readonly maxConcurrent: number;
  private readonly maxQueue: number;
  readonly name: string;

  constructor(options: BulkheadOptions) {
    this.name = options.name;
    this.maxConcurrent = options.maxConcurrent ?? 20;
    this.maxQueue = options.maxQueue ?? 50;
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  getQueueSize(): number {
    return this.queueSize;
  }

  async execute<T>(action: () => Promise<T>): Promise<T> {
    if (this.activeCount < this.maxConcurrent) {
      return this.run(action);
    }

    if (this.queueSize >= this.maxQueue) {
      throw new HttpException(
        {
          message: `Service ${this.name} is overloaded (bulkhead full: active=${this.activeCount}, queued=${this.queueSize})`,
          bulkhead: { name: this.name, active: this.activeCount, queued: this.queueSize },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Wait for a slot
    await this.enqueue();
    return this.run(action);
  }

  private async run<T>(action: () => Promise<T>): Promise<T> {
    this.activeCount++;
    try {
      return await action();
    } finally {
      this.activeCount--;
      this.dequeue();
    }
  }

  private enqueue(): Promise<void> {
    this.queueSize++;
    return new Promise<void>((resolve, reject) => {
      this.waitQueue.push({ resolve, reject });
    });
  }

  private dequeue(): void {
    const next = this.waitQueue.shift();
    if (next) {
      this.queueSize--;
      next.resolve();
    }
  }
}
