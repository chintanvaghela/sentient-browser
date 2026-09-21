import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ChromiumManager } from '../src/browser/chromium.js';

describe('Data Extraction & Parallel Tab Scheduler', () => {
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

  it('extracts structured tables, lists, links, and summary', async () => {
    const page = await browserManager.newPage();

    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Finance & Markets Overview</title></head>
        <body>
          <h1>Market Summary</h1>
          <p>Global financial market indices and key technology equities updated live.</p>

          <table id="stocks_table">
            <thead>
              <tr><th>Symbol</th><th>Company</th><th>Price</th></tr>
            </thead>
            <tbody>
              <tr><td>NVDA</td><td>Nvidia</td><td>$145.20</td></tr>
              <tr><td>AAPL</td><td>Apple</td><td>$230.50</td></tr>
            </tbody>
          </table>

          <ul id="top_news">
            <li>AI chip demand surges to record highs</li>
            <li>Central banks hold interest rates steady</li>
          </ul>

          <div class="links">
            <a href="https://example.com/stocks/nvda">View Nvidia Details</a>
            <a href="https://example.com/stocks/aapl">View Apple Details</a>
            <a href="#top">Back to top</a>
            <a href="javascript:void(0)">Do Nothing</a>
          </div>
        </body>
      </html>
    `;

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    await page.goto(dataUrl);

    // 1. Test table extraction
    const tableData = await page.extractTable('#stocks_table');
    expect(tableData.length).toBe(2);
    expect(tableData[0]).toEqual({ symbol: 'NVDA', company: 'Nvidia', price: '$145.20' });
    expect(tableData[1]).toEqual({ symbol: 'AAPL', company: 'Apple', price: '$230.50' });

    // 2. Test list extraction
    const listData = await page.extractList('#top_news');
    expect(listData.length).toBe(2);
    expect(listData[0]).toBe('AI chip demand surges to record highs');

    // 3. Test clean link extraction (ignores #top and javascript:)
    const links = await page.extractLinks();
    expect(links.length).toBe(2);
    expect(links[0].href).toBe('https://example.com/stocks/nvda');
    expect(links[1].href).toBe('https://example.com/stocks/aapl');

    // 4. Test page summary extraction
    const summary = await page.getSummary();
    expect(summary.title).toBe('Finance & Markets Overview');
    expect(summary.headings).toContain('Market Summary');
    expect(summary.mainText).toContain('Global financial market');
    expect(summary.topLinks.length).toBe(2);

    await page.close();
  });

  it('runs tasks across multiple pages in parallel with controlled concurrency', async () => {
    const pages = [
      { id: 1, title: 'Page 1', content: 'First page content' },
      { id: 2, title: 'Page 2', content: 'Second page content' },
      { id: 3, title: 'Page 3', content: 'Third page content' }
    ];

    const urls = pages.map(
      (p) =>
        `data:text/html;charset=utf-8,${encodeURIComponent(
          `<html><head><title>${p.title}</title></head><body><h1>${p.title}</h1><p>${p.content}</p></body></html>`
        )}`
    );

    const scheduler = browserManager.createScheduler();

    // Process 3 pages with max concurrency of 2
    const results = await scheduler.map(
      urls,
      async (page, url) => {
        const summary = await page.getSummary();
        return {
          title: summary.title,
          headings: summary.headings
        };
      },
      { maxConcurrency: 2 }
    );

    expect(results.length).toBe(3);
    expect(results.every((r) => r.success)).toBe(true);
    expect(results[0].data?.title).toBe('Page 1');
    expect(results[1].data?.title).toBe('Page 2');
    expect(results[2].data?.title).toBe('Page 3');
  });
});
