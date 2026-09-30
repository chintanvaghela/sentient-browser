export * from './client.js';
export { ChromiumManager, SentientPage, type LaunchOptions } from '@sentient-browser/core';
export { WorkerPool, type PoolOptions, type PoolStats, type TaskFunction, type QueuedTask } from '@sentient-browser/core';
export type { SemanticSnapshot, SemanticNode, StateDiff, NodeDelta } from '@sentient-browser/core';

import { ChromiumManager, LaunchOptions, WorkerPool, PoolOptions } from '@sentient-browser/core';

/**
 * Convenient embedded entrypoint for running Sentient Browser directly in-process.
 */
export class SentientBrowser {
  static async launch(options: LaunchOptions = {}): Promise<ChromiumManager> {
    const manager = new ChromiumManager();
    await manager.launch(options);
    return manager;
  }

  /**
   * Creates a multi-worker concurrency pool for parallel agent workflows.
   */
  static createPool(options: PoolOptions = {}): WorkerPool {
    return new WorkerPool(undefined, options);
  }
}

