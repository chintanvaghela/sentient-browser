import { describe, it, expect, afterAll } from 'vitest';
import { ChromiumManager } from '../src/browser/chromium.js';

describe('Real-Time Screencast', () => {
  const browser = new ChromiumManager();

  afterAll(async () => {
    await browser.close();
  });

  it('receives real-time visual frames via CDP Page.startScreencast', async () => {
    await browser.launch({ headless: true });
    const page = await browser.newPage();

    let frameReceived = false;
    let receivedBase64 = '';

    await page.startScreencast((data) => {
      frameReceived = true;
      receivedBase64 = data;
    });

    // Navigate to a test page to generate render cycles
    await page.goto('data:text/html,<html><body style="background: rgb(240, 240, 240);"><h1 style="color: blue;">Sentient Live Stream Test</h1><button id="test_btn">Action Button</button></body></html>');

    // Wait up to 3 seconds for a frame
    const t0 = Date.now();
    while (!frameReceived && Date.now() - t0 < 3000) {
      await new Promise((r) => setTimeout(r, 100));
    }

    expect(frameReceived).toBe(true);
    expect(receivedBase64.length).toBeGreaterThan(50);

    // Stop screencast
    await page.stopScreencast();
    expect(page.isScreencasting).toBe(false);

    await page.close();
  });
});
