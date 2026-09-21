export * from './client.js';
export { ChromiumManager, SentientPage, type LaunchOptions } from '@sentient/core';
export type { SemanticSnapshot, SemanticNode, StateDiff, NodeDelta } from '@sentient/core';

import { ChromiumManager, LaunchOptions } from '@sentient/core';

/**
 * Convenient embedded entrypoint for running Sentient Browser directly in-process.
 */
export class SentientBrowser {
  static async launch(options: LaunchOptions = {}): Promise<ChromiumManager> {
    const manager = new ChromiumManager();
    await manager.launch(options);
    return manager;
  }
}
