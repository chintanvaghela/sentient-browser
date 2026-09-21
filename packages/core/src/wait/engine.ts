import type { CDPSession, Page } from 'playwright-core';
import { WaitOptions, SettlementStatus } from './types.js';

export class WaitSettlementTimeoutError extends Error {
  constructor(message: string, public status?: SettlementStatus) {
    super(message);
    this.name = 'WaitSettlementTimeoutError';
  }
}

/**
 * Smart Wait Engine ensures that a page has reached settled state
 * across network, DOM mutations, animations, and render frames.
 */
export class WaitEngine {
  constructor(private page: Page, private cdp: CDPSession) {}

  /**
   * Waits for the page to reach deterministic settlement.
   */
  async waitForSettlement(options: WaitOptions = {}): Promise<void> {
    const profile = options.profile || 'default';
    const scope = options.scope || 'local';
    const timeoutMs = options.timeoutMs || 10000;
    const quietWindowMs =
      options.quietWindowMs || (profile === 'eager' ? 50 : profile === 'strict' ? 300 : 100);

    // For global scope (e.g. tracking portal transitions), wait at least 1 RAF frame so React/CSS transitions can register
    if (scope === 'global') {
      await this.page.evaluate(() => {
        return new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
      }).catch(() => {});
    }

    const startTime = Date.now();
    const pollInterval = 25;

    while (Date.now() - startTime < timeoutMs) {
      // 1. Query settlement state from page
      const status = await this.page.evaluate((opts) => {
        if (typeof (window as any).__sentient_get_settlement === 'function') {
          return (window as any).__sentient_get_settlement(opts);
        }
        return {
          inFlightRequests: 0,
          timeSinceLastMutation: 1000,
          timeSinceNetActivity: 1000,
          activeAnimations: 0
        };
      }, { scope });

      const elapsed = Date.now() - startTime;
      const isNetworkQuiet = status.inFlightRequests === 0 || (elapsed > 400 && status.timeSinceLastMutation >= quietWindowMs);
      const isDomQuiet = status.timeSinceLastMutation >= quietWindowMs;
      const isAnimationsQuiet = profile === 'eager' && scope !== 'global'
        ? true
        : status.activeAnimations === 0 || (elapsed > 1500);

      if (isNetworkQuiet && isDomQuiet && isAnimationsQuiet) {
        // Double RAF flush to ensure layout and rendering are fully painted
        await this.page.evaluate(() => {
          return new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => resolve());
            });
          });
        });
        return;
      }

      await new Promise((r) => setTimeout(r, pollInterval));
    }

    // If timeout reached, construct diagnostic message
    const finalStatus = await this.page
      .evaluate((opts) => (window as any).__sentient_get_settlement?.(opts), { scope })
      .catch(() => undefined);

    const diagnostic = finalStatus
      ? `Blocking signals: ${finalStatus.inFlightRequests} in-flight requests, ` +
        `${finalStatus.activeAnimations} active animations, ` +
        `last mutation was ${finalStatus.timeSinceLastMutation}ms ago.`
      : 'Unable to query settlement status.';

    throw new WaitSettlementTimeoutError(
      `Page failed to settle within ${timeoutMs}ms (${diagnostic})`,
      finalStatus
    );
  }
}
