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
import { extractLinks, extractTable, extractList, extractSummary, type PageLink, type PageSummary } from '../semantic/extract.js';
import { ParallelScheduler, type SchedulerOptions, type TaskResult } from './scheduler.js';
import { PluginRegistry } from '../plugins/registry.js';
import { HackerNewsPlugin } from '../plugins/builtin/hacker_news.js';
import type { SitePlugin } from '../plugins/types.js';

import { ActionJournal } from '../intent/history.js';
import { AutonomousPlanner } from '../agent/planner.js';
import type { PlannerGoal, PlannerResult } from '../agent/types.js';
import { SemanticCache } from '../memory/cache.js';

// Auto-register default built-in plugins
PluginRegistry.register(HackerNewsPlugin);

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
  public journal: ActionJournal;
  private screencastListener: ((params: any) => void) | null = null;
  public isScreencasting = false;

  constructor(
    public page: Page,
    public cdp: CDPSession,
    public memory: MemoryStore = new MemoryStore(),
    public cache?: SemanticCache
  ) {
    this.waitEngine = new WaitEngine(page, cdp);
    this.intentEngine = new IntentEngine(page, cdp, this.waitEngine);
    this.journal = new ActionJournal();
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
  async goto(url: string, options: { timeoutMs?: number; useCache?: boolean } = {}): Promise<SemanticSnapshot> {
    const urlBefore = this.page.url();
    if (options.useCache && this.cache) {
      const cached = this.cache.get(url);
      if (cached) {
        this.lastSnapshot = cached;
        return cached;
      }
    }

    await this.page.goto(url, {
      waitUntil: 'commit',
      timeout: options.timeoutMs || 30000
    });

    await this.waitEngine.waitForSettlement({ timeoutMs: options.timeoutMs });
    const snapshot = await this.getSemanticDOM();

    if (this.cache) {
      this.cache.set(url, snapshot);
    }

    // Automatically record visited page in memory
    this.memory.recordVisit({
      url: snapshot.url,
      title: snapshot.title,
      timestamp: Date.now(),
      interactiveCount: snapshot.interactiveCount
    });

    this.journal.push({
      id: Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      type: 'goto',
      urlBefore,
      urlAfter: snapshot.url,
      prevSnapshot: snapshot
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
    const urlBefore = this.page.url();
    await this.intentEngine.click(target, options);
    const curr = await this.getSemanticDOM();
    const diff = computeStateDiff(prev, curr);

    this.journal.push({
      id: Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      type: 'click',
      target,
      urlBefore,
      urlAfter: this.page.url(),
      prevSnapshot: prev || undefined,
      diff
    });

    return diff;
  }

  /**
   * Fills an input element with text.
   */
  async fill(target: string, text: string, options?: FillOptions): Promise<StateDiff> {
    const prev = this.lastSnapshot;
    const prevNode = prev?.nodes.find((n) => n.id === target);
    const prevValue = prevNode?.value || '';

    await this.intentEngine.fill(target, text, options);
    const curr = await this.getSemanticDOM();
    const diff = computeStateDiff(prev, curr);

    this.journal.push({
      id: Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      type: 'fill',
      target,
      prevValue,
      urlBefore: this.page.url(),
      prevSnapshot: prev || undefined,
      diff
    });

    return diff;
  }

  /**
   * Reverts the most recent action executed on this page.
   * If last action was fill: restores previous field value.
   * If last action navigated to another page: navigates back.
   * If last action opened a modal/dialog: dispatches Escape.
   */
  async rollback(): Promise<StateDiff> {
    const record = this.journal.pop();
    if (!record) {
      const curr = await this.getSemanticDOM();
      return computeStateDiff(curr, curr);
    }

    const prev = this.lastSnapshot;

    if (record.type === 'fill' && record.target) {
      await this.intentEngine.fill(record.target, record.prevValue || '', { clearFirst: true });
    } else if (record.type === 'goto' || (record.urlAfter && record.urlBefore !== record.urlAfter)) {
      await this.page.goBack({ waitUntil: 'commit' }).catch(() => {});
      await this.waitEngine.waitForSettlement();
    } else if (record.type === 'click') {
      await this.cdp.send('Input.dispatchKeyEvent', {
        type: 'rawKeyDown',
        key: 'Escape',
        code: 'Escape',
        windowsVirtualKeyCode: 27
      }).catch(() => {});
      await this.cdp.send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'Escape',
        code: 'Escape',
        windowsVirtualKeyCode: 27
      }).catch(() => {});
      await this.waitEngine.waitForSettlement({ profile: 'eager' });
    }

    const curr = await this.getSemanticDOM();
    return computeStateDiff(prev, curr);
  }

  /**
   * Solves a high-level natural language goal autonomously.
   */
  async solve(goal: PlannerGoal | string): Promise<PlannerResult> {
    const planner = new AutonomousPlanner(this);
    return planner.solve(goal);
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
   * Extracts clean HTTP/HTTPS links from the page.
   */
  async extractLinks(): Promise<PageLink[]> {
    return extractLinks(this.page);
  }

  /**
   * Extracts tabular data from table elements into JSON objects.
   */
  async extractTable(selector?: string): Promise<Array<Record<string, string>>> {
    return extractTable(this.page, selector);
  }

  /**
   * Extracts list items from ul/ol elements.
   */
  async extractList(selector?: string): Promise<string[]> {
    return extractList(this.page, selector);
  }

  /**
   * Extracts a semantic summary of the page (title, headings, text, top links).
   */
  async getSummary(): Promise<PageSummary> {
    return extractSummary(this.page);
  }

  /**
   * Retrieves a registered site plugin bound to this page.
   */
  plugin<T = any>(name: string): T {
    return PluginRegistry.bind(this, name);
  }

  /**
   * Starts real-time visual screencasting via CDP Page.startScreencast.
   */
  async startScreencast(onFrame: (data: string, metadata: any) => void): Promise<void> {
    if (this.isScreencasting) return;
    this.isScreencasting = true;

    this.screencastListener = async (params: { data: string; metadata: any; sessionId: number }) => {
      try {
        await this.cdp.send('Page.screencastFrameAck', { sessionId: params.sessionId });
      } catch (_) {}
      onFrame(params.data, params.metadata);
    };

    this.cdp.on('Page.screencastFrame', this.screencastListener);

    await this.cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 70,
      maxWidth: 1280,
      maxHeight: 720,
      everyNthFrame: 1
    }).catch(() => {});
  }

  /**
   * Stops real-time screencasting.
   */
  async stopScreencast(): Promise<void> {
    if (!this.isScreencasting) return;
    this.isScreencasting = false;

    if (this.screencastListener) {
      this.cdp.off('Page.screencastFrame', this.screencastListener);
      this.screencastListener = null;
    }

    await this.cdp.send('Page.stopScreencast').catch(() => {});
  }

  /**
   * Closes the page.
   */
  async close(): Promise<void> {
    await this.stopScreencast().catch(() => {});
    await this.page.close().catch(() => {});
  }
}

/**
 * Manages Chromium browser lifecycle, contexts, and low-level CDP sessions.
 */
export class ChromiumManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  public memory: MemoryStore;
  public cache: SemanticCache;

  constructor(options: { persistMemoryPath?: string; cacheTtlMs?: number } = {}) {
    this.memory = new MemoryStore({ persistPath: options.persistMemoryPath });
    this.cache = new SemanticCache({ defaultTtlMs: options.cacheTtlMs });
  }

  /**
   * Registers a site plugin globally.
   */
  registerPlugin(plugin: SitePlugin): void {
    PluginRegistry.register(plugin);
  }

  /**
   * Creates a parallel task scheduler using this browser instance.
   */
  createScheduler(): ParallelScheduler {
    return new ParallelScheduler(this);
  }

  /**
   * Executes tasks across multiple URLs in parallel with controlled concurrency.
   */
  async mapPages<T>(
    urls: string[],
    task: (page: SentientPage, url: string) => Promise<T>,
    options?: SchedulerOptions
  ): Promise<Array<TaskResult<T>>> {
    return this.createScheduler().map(urls, task, options);
  }

  /**
   * Launches Chromium and creates an isolated context.
   */
  async launch(options: LaunchOptions = {}): Promise<void> {
    if (this.browser) return;

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
    if (!this.browser || !this.browser.isConnected() || !this.context) {
      await this.launch();
    }

    let page: Page;
    let cdp: CDPSession;
    try {
      page = await this.context!.newPage();
      cdp = await this.context!.newCDPSession(page);
    } catch (_) {
      await this.close();
      await this.launch();
      page = await this.context!.newPage();
      cdp = await this.context!.newCDPSession(page);
    }

    return new SentientPage(page, cdp, this.memory, this.cache);
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
