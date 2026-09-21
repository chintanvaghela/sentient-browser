import { sentientMatchers } from './matchers.js';

export * from './matchers.js';
export * from './playwright.js';

/**
 * Registers Sentient custom matchers into an existing expect instance (Vitest or Playwright).
 *
 * @example
 * ```typescript
 * import { expect } from 'vitest';
 * import { registerSentientMatchers } from '@sentient/test';
 *
 * registerSentientMatchers(expect);
 * ```
 */
export function registerSentientMatchers(expectInstance: any): void {
  if (expectInstance && typeof expectInstance.extend === 'function') {
    expectInstance.extend(sentientMatchers);
  }
}
