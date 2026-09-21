import { ChromiumManager, SentientPage } from './chromium.js';

export interface SchedulerOptions {
  maxConcurrency?: number;
  timeoutMs?: number;
}

export interface TaskResult<T> {
  url: string;
  success: boolean;
  data?: T;
  error?: string;
  durationMs: number;
}

/**
 * Parallel Tab Scheduler coordinates concurrent browser tabs
 * for batch research, scraping, and multi-site agent workflows.
 */
export class ParallelScheduler {
  constructor(private browserManager: ChromiumManager) {}

  /**
   * Executes a task across an array of URLs with controlled concurrency.
   */
  async map<T>(
    urls: string[],
    task: (page: SentientPage, url: string) => Promise<T>,
    options: SchedulerOptions = {}
  ): Promise<Array<TaskResult<T>>> {
    const maxConcurrency = Math.max(1, options.maxConcurrency || 3);
    const results: Array<TaskResult<T>> = new Array(urls.length);

    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < urls.length) {
        const index = nextIndex++;
        const url = urls[index];
        const start = Date.now();

        let page: SentientPage | null = null;
        try {
          page = await this.browserManager.newPage();
          await page.goto(url, { timeoutMs: options.timeoutMs });

          const data = await task(page, url);

          results[index] = {
            url,
            success: true,
            data,
            durationMs: Date.now() - start
          };
        } catch (err: any) {
          results[index] = {
            url,
            success: false,
            error: err.message || 'Task failed',
            durationMs: Date.now() - start
          };
        } finally {
          if (page) {
            await page.close().catch(() => {});
          }
        }
      }
    };

    const workers = Array.from({ length: Math.min(maxConcurrency, urls.length) }, () => worker());
    await Promise.all(workers);

    return results;
  }
}
