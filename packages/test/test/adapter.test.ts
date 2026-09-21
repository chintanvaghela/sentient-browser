import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright-core';
import { findCachedChromiumExecutable } from '@sentient/core';
import {
  registerSentientMatchers,
  wrapPlaywrightPage,
  sentientClick,
  sentientFill,
  sentientHover,
  sentientScroll,
  sentientRollback,
  sentientSnapshot
} from '../src/index.js';

// Register custom matchers with Vitest expect
registerSentientMatchers(expect);

declare module 'vitest' {
  interface Assertion<T = any> {
    toSettle(options?: any): Promise<void>;
    toHaveAdded(matcher: any): void;
    toHaveRemoved(matcher: any): void;
    toHaveUpdated(id: string): void;
    toHaveSemanticText(text: string | RegExp): Promise<void>;
  }
}

describe('@sentient/test Playwright Adapter & Matchers', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    const execPath = findCachedChromiumExecutable();
    browser = await chromium.launch({
      executablePath: execPath,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    page = await browser.newPage();
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  it('verifies matcher unit logic on mock state diffs', () => {
    const mockDiff = {
      added: [
        { id: 'btn_confirm', role: 'button', text: 'Confirm', tag: 'button', visible: true, enabled: true, clickable: true, focused: false, bbox: { x: 0, y: 0, width: 50, height: 20 } }
      ],
      removed: [
        { id: 'loader', role: 'generic', text: 'Loading...', tag: 'div', visible: true, enabled: true, clickable: false, focused: false, bbox: { x: 0, y: 0, width: 50, height: 20 } }
      ],
      updated: [
        { id: 'status_label', prev: { text: 'Draft' }, curr: { text: 'Published' } }
      ],
      operationsCount: 3,
      timestamp: Date.now()
    };

    (expect(mockDiff) as any).toHaveAdded('Confirm');
    (expect(mockDiff) as any).toHaveAdded({ role: 'button' });
    (expect(mockDiff) as any).toHaveRemoved('Loading');
    (expect(mockDiff) as any).toHaveUpdated('status_label');
  });

  it('wraps a standard Playwright page into a SentientPage and executes actions', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Test Adapter Page</title></head>
        <body>
          <h1 id="header">Welcome to SprintDesk</h1>
          <input id="email" type="text" placeholder="Enter your email" />
          <button id="submit_btn" onclick="document.body.innerHTML += '<p id=success>Submission successful</p>'">Submit</button>
        </body>
      </html>
    `;

    await page.goto(`data:text/html,${encodeURIComponent(html)}`);

    const sentientPage = await wrapPlaywrightPage(page);
    expect(sentientPage).toBeDefined();

    // Verify semantic snapshot
    const snapshot = await sentientSnapshot(page);
    expect(snapshot.interactiveCount).toBe(2);

    // Assert semantic text matcher
    await (expect(sentientPage) as any).toHaveSemanticText('Welcome to SprintDesk');

    // Hover over input
    const hoverDiff = await sentientHover(page, 'Enter your email');
    expect(hoverDiff).toBeDefined();

    // Scroll page
    const scrollDiff = await sentientScroll(page, { direction: 'down', amountPx: 100 });
    expect(scrollDiff).toBeDefined();

    // Fill input using sentientFill
    await sentientFill(page, 'Enter your email', 'developer@scrum.com');

    // Click submit using sentientClick
    const diff = await sentientClick(page, 'Submit');
    expect(diff).toBeDefined();

    // Verify added element through custom matcher
    (expect(diff) as any).toHaveAdded('Submission successful');

    // Rollback test
    const rollbackDiff = await sentientRollback(page);
    expect(rollbackDiff).toBeDefined();
  });

  it('interacts with elements in position: fixed overlays and overflow-y: auto containers with global toSettle', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Portal & Overlay Test</title>
          <style>
            .fixed-overlay {
              position: fixed;
              top: 0; left: 0; right: 0; bottom: 0;
              background: rgba(0, 0, 0, 0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              transition: opacity 150ms ease-in-out;
            }
            .scroll-container {
              max-height: 200px;
              overflow-y: auto;
              width: 300px;
              padding: 20px;
              background: white;
            }
          </style>
        </head>
        <body>
          <div class="fixed-overlay" role="dialog">
            <div class="scroll-container">
              <div style="height: 50px;">Top Spacer</div>
              <input id="task-title" placeholder="Enter task title" type="text" />
              <div style="height: 100px;">Middle Spacer</div>
              <button id="create-btn" onclick="document.body.innerHTML += '<p id=created>Task Created Successfully</p>'">Create Task</button>
            </div>
          </div>
        </body>
      </html>
    `;

    await page.goto(`data:text/html,${encodeURIComponent(html)}`);
    const sentientPage = await wrapPlaywrightPage(page);

    // Test toSettle with global scope
    await (expect(sentientPage) as any).toSettle({ scope: 'global' });

    // Test sentientFill inside position: fixed + overflow-y: auto
    await sentientFill(page, 'Enter task title', 'New Autonomous Task');
    const inputVal = await page.$eval('#task-title', (el: any) => el.value);
    expect(inputVal).toBe('New Autonomous Task');

    // Test sentientClick inside position: fixed overlay
    const diff = await sentientClick(page, 'Create Task');
    expect(diff).toBeDefined();
    (expect(diff) as any).toHaveAdded('Task Created Successfully');
  });
});
