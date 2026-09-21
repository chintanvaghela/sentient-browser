import type { SentientPage } from '../browser/chromium.js';

export interface PoolOptions {
  /** Maximum number of concurrent browser workers/tabs. Default: 4 */
  maxConcurrency?: number;

  /** Isolation mode between workers: 'context' (separate cookies/storage) or 'page'. Default: 'context' */
  isolation?: 'context' | 'page';

  /** Number of tasks a worker executes before being recycled to prevent memory leaks. Default: 25 */
  recycleAfterTasks?: number;

  /** Maximum time allowed for a single task before rejecting with timeout error (ms). Default: 30000 */
  taskTimeoutMs?: number;

  /** Whether browser instances run in headless mode. Default: true */
  headless?: boolean;
}

export interface PoolStats {
  activeWorkers: number;
  idleWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskDurationMs: number;
}

export type TaskFunction<T> = (page: SentientPage, workerId: number) => Promise<T>;

export interface QueuedTask<T> {
  fn: TaskFunction<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  taskTimeoutMs: number;
  enqueuedAt: number;
}
