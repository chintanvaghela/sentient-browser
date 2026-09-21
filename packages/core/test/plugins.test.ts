import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ChromiumManager } from '../src/browser/chromium.js';
import { SitePlugin } from '../src/plugins/types.js';

describe('Site Plugin Architecture', () => {
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

  it('binds and executes custom site plugin methods', async () => {
    // 1. Define a custom site plugin (e.g. for a mock store)
    const storePlugin: SitePlugin = {
      name: 'mockstore',
      domainPattern: 'store.local',
      create(page) {
        return {
          async getCartTotal(): Promise<string> {
            return page.page.evaluate(() => {
              return document.getElementById('cart_badge')?.textContent || '$0';
            });
          },
          async applyCoupon(code: string): Promise<void> {
            await page.fill('coupon_input', code);
            await page.click('apply_btn');
          }
        };
      }
    };

    browserManager.registerPlugin(storePlugin);

    // 2. Open mock store page
    const page = await browserManager.newPage();
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Mock Store</title></head>
        <body>
          <span id="cart_badge">$99.00</span>
          <input id="coupon_input" placeholder="Coupon" />
          <button id="apply_btn" onclick="document.getElementById('cart_badge').innerText = '$79.00'">Apply</button>
        </body>
      </html>
    `;
    await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // 3. Use plugin
    const store = page.plugin('mockstore');
    const initialTotal = await store.getCartTotal();
    expect(initialTotal).toBe('$99.00');

    await store.applyCoupon('DISCOUNT20');
    const discountedTotal = await store.getCartTotal();
    expect(discountedTotal).toBe('$79.00');

    await page.close();
  });

  it('runs built-in HackerNewsPlugin on mock markup', async () => {
    const page = await browserManager.newPage();
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <table>
            <tr class="athing">
              <td class="title"><span class="titleline"><a href="https://example.com/ai-runtime">Sentient AI Runtime Released</a></span></td>
            </tr>
            <tr>
              <td class="subtext"><span class="score">350 points</span> by <a class="hnuser">antigravity</a></td>
            </tr>
          </table>
        </body>
      </html>
    `;
    await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    const hn = page.plugin('hackernews');
    const stories = await hn.getTopStories(5);

    expect(stories.length).toBe(1);
    expect(stories[0].title).toBe('Sentient AI Runtime Released');
    expect(stories[0].points).toBe('350 points');
    expect(stories[0].author).toBe('antigravity');

    await page.close();
  });
});
