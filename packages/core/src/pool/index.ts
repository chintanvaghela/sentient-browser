import { ChromiumManager, SentientPage } from '../browser/chromium.js';
import type { BrowserContext } from 'playwright-core';
import type { PoolOptions, PoolStats, TaskFunction, QueuedTask } from './types.js';

interface WorkerSlot {
  id: number;
  context?: BrowserContext;
  page: SentientPage;
  busy: boolean;
  tasksCount: number;
}

export class WorkerPool {
  private manager: ChromiumManager;
  private ownManager = false;
  private options: Required<PoolOptions>;
  private workers: WorkerSlot[] = [];
  private queue: QueuedTask<any>[] = [];
  private launched = false;
  private closed = false;

  private completedTasks = 0;
  private failedTasks = 0;
  private totalDurationMs = 0;

  constructor(manager?: ChromiumManager, options: PoolOptions = {}) {
    if (manager) {
      this.manager = manager;
    } else {
      this.manager = new ChromiumManager();
      this.ownManager = true;
    }

    this.options = {
      maxConcurrency: options.maxConcurrency || 4,
      isolation: options.isolation || 'context',
      recycleAfterTasks: options.recycleAfterTasks || 25,
      taskTimeoutMs: options.taskTimeoutMs || 30000,
      headless: options.headless !== false
    };
  }

  /**
   * Initializes browser and pre-warms worker tabs.
   */
  async launch(): Promise<void> {
    if (this.launched) return;
    await this.manager.launch({ headless: this.options.headless });

    // Pre-warm workers up to maxConcurrency
    for (let i = 0; i < this.options.maxConcurrency; i++) {
      const slot = await this.createWorker(i + 1);
      this.workers.push(slot);
    }
    this.launched = true;
  }

  private async createWorker(id: number): Promise<WorkerSlot> {
    if (this.options.isolation === 'context') {
      const context = await this.manager.newContext();
      const page = await this.manager.newPageInContext(context);
      return { id, context, page, busy: false, tasksCount: 0 };
    } else {
      const page = await this.manager.newPage();
      return { id, page, busy: false, tasksCount: 0 };
    }
  }

  private async recycleWorker(worker: WorkerSlot): Promise<void> {
    try {
      await worker.page.page.close().catch(() => {});
      if (worker.context) {
        await worker.context.close().catch(() => {});
      }
    } catch (_) {}

    if (this.options.isolation === 'context') {
      const context = await this.manager.newContext();
      worker.context = context;
      worker.page = await this.manager.newPageInContext(context);
    } else {
      worker.page = await this.manager.newPage();
    }
    worker.tasksCount = 0;
    worker.busy = false;
  }

  /**
   * Returns current pool performance metrics.
   */
  getStats(): PoolStats {
    const active = this.workers.filter((w) => w.busy).length;
    const idle = this.workers.length - active;
    const avgDuration =
      this.completedTasks > 0
        ? Math.round(this.totalDurationMs / this.completedTasks)
        : 0;

    return {
      activeWorkers: active,
      idleWorkers: idle,
      queuedTasks: this.queue.length,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      averageTaskDurationMs: avgDuration
    };
  }

  /**
   * Schedules a task to run on the next available worker.
   */
  async run<T>(fn: TaskFunction<T>, timeoutMs?: number): Promise<T> {
    if (this.closed) throw new Error('WorkerPool is closed');
    if (!this.launched) await this.launch();

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn,
        resolve,
        reject,
        taskTimeoutMs: timeoutMs || this.options.taskTimeoutMs,
        enqueuedAt: Date.now()
      });
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.queue.length === 0 || this.closed) return;

    const availableWorker = this.workers.find((w) => !w.busy);
    if (!availableWorker) return;

    const task = this.queue.shift();
    if (!task) return;

    availableWorker.busy = true;
    availableWorker.tasksCount++;

    const start = Date.now();

    let timer: NodeJS.Timeout | null = null;
    let completed = false;

    const timeoutPromise = new Promise<never>((_, rej) => {
      timer = setTimeout(() => {
        if (!completed) {
          rej(new Error(`Task exceeded timeout limit of ${task.taskTimeoutMs}ms`));
        }
      }, task.taskTimeoutMs);
    });

    try {
      const result = await Promise.race([
        task.fn(availableWorker.page, availableWorker.id),
        timeoutPromise
      ]);
      completed = true;
      if (timer) clearTimeout(timer);

      const duration = Date.now() - start;
      this.completedTasks++;
      this.totalDurationMs += duration;
      task.resolve(result);
    } catch (err) {
      completed = true;
      if (timer) clearTimeout(timer);
      this.failedTasks++;
      task.reject(err);
    } finally {
      // Check if worker reached recycling threshold
      if (availableWorker.tasksCount >= this.options.recycleAfterTasks) {
        await this.recycleWorker(availableWorker);
      } else {
        availableWorker.busy = false;
      }

      // Continue queue
      this.processNext();
    }
  }

  /**
   * Executes a collection of items in parallel across the worker pool.
   */
  async map<T, R>(
    items: T[],
    fn: (item: T, page: SentientPage, workerId: number) => Promise<R>
  ): Promise<R[]> {
    return Promise.all(items.map((item) => this.run((page, id) => fn(item, page, id))));
  }

  /**
   * Waits for all active and queued tasks to complete.
   */
  async drain(): Promise<void> {
    while (this.queue.length > 0 || this.workers.some((w) => w.busy)) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  /**
   * Gracefully drains tasks and closes all worker tabs and browsers.
   */
  async close(): Promise<void> {
    this.closed = true;
    await this.drain();

    for (const worker of this.workers) {
      await worker.page.page.close().catch(() => {});
      if (worker.context) {
        await worker.context.close().catch(() => {});
      }
    }
    this.workers = [];

    if (this.ownManager) {
      await this.manager.close();
    }
  }
}

export * from './types.js';
