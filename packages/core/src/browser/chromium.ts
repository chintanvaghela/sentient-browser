import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { chromium, type Browser, type BrowserContext, type Page, type CDPSession } from 'playwright-core';
import { SENTIENT_INJECTED_SCRIPT } from './injected.js';
import { IN_PAGE_EXTRACTOR_SCRIPT } from '../semantic/extractor.js';
import { SemanticSnapshot } from '../semantic/types.js';
import { computeStateDiff } from '../diff/engine.js';
import { StateDiff } from '../diff/types.js';
import { WaitEngine } from '../wait/engine.js';
import { IntentEngine } from '../intent/engine.js';
import { ClickOptions, FillOptions, ScrollOptions } from '../intent/types.js';
import { MemoryStore } from '../memory/store.js';

export interface LaunchOptions {
  headless?: boolean;
  executablePath?: string;
  viewport?: { width: number; height: number };
  args?: string[];
  persistMemoryPath?: string;
}

/**
 * Searches common Playwright cache directories to find an existing Chromium or headless shell binary.
 */
export function findCachedChromiumExecutable(): string | undefined {
  const cacheDir = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!fs.existsSync(cacheDir)) return undefined;

  try {
    const entries = fs.readdirSync(cacheDir);

    // Prefer headless shell for lightweight execution
    const shellDirs = entries.filter((e) => e.startsWith('chromium_headless_shell-')).sort().reverse();
    for (const dir of shellDirs) {
      const candidate = path.join(cacheDir, dir, 'chrome-headless-shell-linux64', 'chrome-headless-shell');
      if (fs.existsSync(candidate)) return candidate;
    }

    // Fallback to standard chromium builds
    const chromeDirs = entries.filter((e) => e.startsWith('chromium-')).sort().reverse();
    for (const dir of chromeDirs) {
      const candidate = path.join(cacheDir, dir, 'chrome-linux64', 'chrome');
      if (fs.existsSync(candidate)) return candidate;
    }
  } catch (_) {}

  return undefined;
}

/**
 * Represents a live page managed by Sentient Runtime.
 */
export class SentientPage {
  private waitEngine: WaitEngine;
  private intentEngine: IntentEngine;
  private lastSnapshot: SemanticSnapshot | null = null;

  constructor(
    public page: Page,
    public cdp: CDPSession,
    public memory: MemoryStore = new MemoryStore()
  ) {
    this.waitEngine = new WaitEngine(page, cdp);
    this.intentEngine = new IntentEngine(page, cdp, this.waitEngine);
  }

  /**
   * Stores a key-value pair in agent memory.
   */
  remember(key: string, value: any): void {
    this.memory.remember(key, value);
  }

  /**
   * Recalls a value from agent memory by key.
   */
  recall<T = any>(key: string): T | undefined {
    return this.memory.recall<T>(key);
  }

  /**
   * Clears all agent memory.
   */
  clearMemory(): void {
    this.memory.clear();
  }

  /**
   * Navigates to a URL and waits for settlement.
   */
  async goto(url: string, options: { timeoutMs?: number } = {}): Promise<SemanticSnapshot> {
    await this.page.goto(url, {
      waitUntil: 'commit',
      timeout: options.timeoutMs || 30000
    });

    await this.waitEngine.waitForSettlement({ timeoutMs: options.timeoutMs });
    const snapshot = await this.getSemanticDOM();

    // Automatically record visited page in memory
    this.memory.recordVisit({
      url: snapshot.url,
      title: snapshot.title,
      timestamp: Date.now(),
      interactiveCount: snapshot.interactiveCount
    });

    return snapshot;
  }

  /**
   * Extracts the current Semantic DOM snapshot from the page.
   */
  async getSemanticDOM(): Promise<SemanticSnapshot> {
    const snapshot = (await this.page.evaluate(IN_PAGE_EXTRACTOR_SCRIPT)) as SemanticSnapshot;
    this.lastSnapshot = snapshot;
    return snapshot;
  }

  /**
   * Computes the latest incremental state diff since the previous snapshot.
   */
  async getDiff(): Promise<StateDiff> {
    const current = await this.getSemanticDOM();
    const diff = computeStateDiff(this.lastSnapshot, current);
    return diff;
  }

  /**
   * Clicks a target by Stable ID or semantic label.
   */
  async click(target: string, options?: ClickOptions): Promise<StateDiff> {
    const prev = this.lastSnapshot;
    await this.intentEngine.click(target, options);
    const curr = await this.getSemanticDOM();
    return computeStateDiff(prev, curr);
  }

  /**
   * Fills an input element with text.
   */
  async fill(target: string, text: string, options?: FillOptions): Promise<StateDiff> {
    const prev = this.lastSnapshot;
    await this.intentEngine.fill(target, text, options);
    const curr = await this.getSemanticDOM();
    return computeStateDiff(prev, curr);
  }

  /**
   * Hovers mouse over element.
   */
  async hover(target: string): Promise<StateDiff> {
    const prev = this.lastSnapshot;
    await this.intentEngine.hover(target);
    const curr = await this.getSemanticDOM();
    return computeStateDiff(prev, curr);
  }

  /**
   * Scrolls the page or element.
   */
  async scroll(options: ScrollOptions): Promise<StateDiff> {
    const prev = this.lastSnapshot;
    await this.intentEngine.scroll(options);
    const curr = await this.getSemanticDOM();
    return computeStateDiff(prev, curr);
  }

  /**
   * Closes the page.
   */
  async close(): Promise<void> {
    await this.page.close();
  }
}

/**
 * Manages Chromium browser lifecycle, contexts, and low-level CDP sessions.
 */
export class ChromiumManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  public memory: MemoryStore;

  constructor(options: { persistMemoryPath?: string } = {}) {
    this.memory = new MemoryStore({ persistPath: options.persistMemoryPath });
  }

  /**
   * Launches Chromium and creates an isolated context.
   */
  async launch(options: LaunchOptions = {}): Promise<void> {
    if (options.persistMemoryPath) {
      this.memory = new MemoryStore({ persistPath: options.persistMemoryPath });
    }

    const execPath =
      options.executablePath ||
      findCachedChromiumExecutable() ||
      chromium.executablePath();

    this.browser = await chromium.launch({
      headless: options.headless !== false,
      executablePath: execPath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        ...(options.args || [])
      ]
    });

    this.context = await this.browser.newContext({
      viewport: options.viewport || { width: 1280, height: 720 }
    });

    // Automatically inject our runtime monitoring script into every new frame
    await this.context.addInitScript(SENTIENT_INJECTED_SCRIPT);
  }

  /**
   * Creates a new page attached to a direct CDP session and shared memory store.
   */
  async newPage(): Promise<SentientPage> {
    if (!this.context) {
      throw new Error('Browser is not launched. Call launch() first.');
    }

    const page = await this.context.newPage();
    const cdp = await this.context.newCDPSession(page);

    return new SentientPage(page, cdp, this.memory);
  }

  /**
   * Closes the browser and terminates all child processes.
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }
}
