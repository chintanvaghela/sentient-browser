export * from './client.js';
export { ChromiumManager, SentientPage, type LaunchOptions } from '@sentient/core';
export { WorkerPool, type PoolOptions, type PoolStats, type TaskFunction, type QueuedTask } from '@sentient/core';
export type { SemanticSnapshot, SemanticNode, StateDiff, NodeDelta } from '@sentient/core';

import { ChromiumManager, LaunchOptions, WorkerPool, PoolOptions } from '@sentient/core';

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

