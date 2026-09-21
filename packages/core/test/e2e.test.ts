import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ChromiumManager } from '../src/browser/chromium.js';

describe('Sentient Browser Runtime E2E', () => {
  let browserManager: ChromiumManager;

  beforeAll(async () => {
    browserManager = new ChromiumManager();
    await browserManager.launch({ headless: true });
  });

  afterAll(async () => {
    if (browserManager) {
      await browserManager.close();
    }
  });

  it('prunes noise, generates stable IDs, fills input, and executes click with state diff', async () => {
    const page = await browserManager.newPage();

    // HTML fixture containing layout noise, form fields, and dynamic JS state
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Test Auth Form</title></head>
        <body>
          <div class="layout-wrapper flex flex-col noise-123">
            <div class="inner-container container-xyz">
              <h1>Welcome to Sentient Test</h1>
              <p>Please enter your credentials below.</p>
              
              <form id="loginForm" onsubmit="event.preventDefault(); document.getElementById('status_msg').innerText = 'Success: Logged in as ' + document.getElementById('email_field').value;">
                <div class="input-group">
                  <input id="email_field" type="text" placeholder="Email Address" />
                </div>
                <div class="btn-group">
                  <button id="login_btn" type="submit">Log In</button>
                </div>
              </form>

              <div id="status_msg">Status: Idle</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    const snapshot = await page.goto(dataUrl);

    // 1. Verify semantic DOM properties
    expect(snapshot.title).toBe('Test Auth Form');
    expect(snapshot.nodes.length).toBeGreaterThan(0);

    // Layout wrappers like "layout-wrapper" and "inner-container" should be pruned
    const hasLayoutNoise = snapshot.nodes.some((n) => n.tag === 'div' && (n.text === '' || n.text.includes('Welcome')));
    expect(hasLayoutNoise).toBe(false);

    // Form inputs and buttons should be extracted with stable IDs
    const emailInput = snapshot.nodes.find((n) => n.placeholder === 'Email Address');
    expect(emailInput).toBeDefined();
    expect(emailInput?.role).toBe('textbox');
    expect(emailInput?.id).toContain('email_address');

    const loginButton = snapshot.nodes.find((n) => n.role === 'button' && n.text === 'Log In');
    expect(loginButton).toBeDefined();
    expect(loginButton?.role).toBe('button');
    expect(loginButton?.id).toContain('log_in');

    // 2. Perform intent actions: fill & click
    const fillDiff = await page.fill(emailInput!.id, 'agent@sentient.ai');
    expect(fillDiff).toBeDefined();

    const clickDiff = await page.click(loginButton!.id);
    expect(clickDiff).toBeDefined();
    expect(clickDiff.compact).toContain('Success: Logged in as agent@sentient.ai');

    await page.close();
  });
});
