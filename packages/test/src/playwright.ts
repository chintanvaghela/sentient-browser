import type { Page, CDPSession } from 'playwright-core';
import {
  SentientPage,
  SENTIENT_INJECTED_SCRIPT,
  MemoryStore,
  SemanticCache,
  ClickOptions,
  FillOptions,
  ScrollOptions,
  StateDiff,
  SemanticSnapshot
} from '@sentient-browser/core';

// Cache of wrapped SentientPage instances by Playwright page
const pageWrapperMap = new WeakMap<Page, SentientPage>();

/**
 * Wraps an existing Playwright Page into a high-performance SentientPage.
 * Automatically injects monitoring scripts and attaches a direct CDP session.
 */
export async function wrapPlaywrightPage(
  page: Page,
  options: { memoryPath?: string; cacheTtlMs?: number } = {}
): Promise<SentientPage> {
  const cached = pageWrapperMap.get(page);
  if (cached) return cached;

  // Inject runtime tracking scripts if not already present
  await page.addInitScript(SENTIENT_INJECTED_SCRIPT).catch(() => {});
  await page.evaluate(SENTIENT_INJECTED_SCRIPT).catch(() => {});

  // Attach direct Chrome DevTools Protocol session
  const cdp: CDPSession = await page.context().newCDPSession(page);

  const memory = new MemoryStore({ persistPath: options.memoryPath });
  const cache = new SemanticCache({ defaultTtlMs: options.cacheTtlMs });

  const sentientPage = new SentientPage(page, cdp, memory, cache);
  pageWrapperMap.set(page, sentientPage);

  return sentientPage;
}

/**
 * Drop-in click helper that resolves elements via Stable IDs / Inverted Index,
 * dispatches native CDP hardware clicks, and waits for deterministic settlement.
 */
export async function sentientClick(
  page: Page | SentientPage,
  target: string,
  options?: ClickOptions
): Promise<StateDiff> {
  if (page instanceof SentientPage) {
    return page.click(target, options);
  }
  const sp = await wrapPlaywrightPage(page);
  return sp.click(target, options);
}

/**
 * Drop-in fill helper that targets inputs via label, name, or stable ID,
 * types via native CDP, and triggers React/Vue synthetic events.
 */
export async function sentientFill(
  page: Page | SentientPage,
  target: string,
  text: string,
  options?: FillOptions
): Promise<StateDiff> {
  if (page instanceof SentientPage) {
    return page.fill(target, text, options);
  }
  const sp = await wrapPlaywrightPage(page);
  return sp.fill(target, text, options);
}

/**
 * Drop-in hover helper that targets elements to reveal menus or tooltips.
 */
export async function sentientHover(
  page: Page | SentientPage,
  target: string
): Promise<StateDiff> {
  if (page instanceof SentientPage) {
    return page.hover(target);
  }
  const sp = await wrapPlaywrightPage(page);
  return sp.hover(target);
}

/**
 * Drop-in scroll helper with automatic DOM settlement.
 */
export async function sentientScroll(
  page: Page | SentientPage,
  options: ScrollOptions = {}
): Promise<StateDiff> {
  if (page instanceof SentientPage) {
    return page.scroll(options);
  }
  const sp = await wrapPlaywrightPage(page);
  return sp.scroll(options);
}

/**
 * Drop-in rollback helper to undo actions and restore state.
 */
export async function sentientRollback(
  page: Page | SentientPage
): Promise<StateDiff> {
  if (page instanceof SentientPage) {
    return page.rollback();
  }
  const sp = await wrapPlaywrightPage(page);
  return sp.rollback();
}

/**
 * Retrieves the pruned semantic DOM snapshot (>90% token reduction).
 */
export async function sentientSnapshot(page: Page | SentientPage): Promise<SemanticSnapshot> {
  if (page instanceof SentientPage) {
    return page.getSemanticDOM();
  }
  const sp = await wrapPlaywrightPage(page);
  return sp.getSemanticDOM();
}

/**
 * Solves a high-level goal autonomously on the page.
 */
export async function sentientSolve(
  page: Page | SentientPage,
  goal: string,
  options?: { maxSteps?: number }
) {
  const goalObj = options?.maxSteps ? { goal, maxSteps: options.maxSteps } : goal;
  if (page instanceof SentientPage) {
    return page.solve(goalObj);
  }
  const sp = await wrapPlaywrightPage(page);
  return sp.solve(goalObj);
}
