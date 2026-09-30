import { SentientBrowser } from '@sentient-browser/sdk';

async function runParallelResearch() {
  console.log('🚀 Starting Sentient Browser Parallel Research Agent...\n');

  const browser = await SentientBrowser.launch({ headless: true });

  // Simulate multiple target product / article pages to research concurrently
  const targets = [
    {
      symbol: 'NVDA',
      name: 'NVIDIA Corporation',
      price: '$145.20',
      pe: '45.2',
      summary: 'Leading manufacturer of graphics processing units and AI accelerator hardware.'
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      price: '$428.50',
      pe: '35.8',
      summary: 'Global software, cloud computing (Azure), and artificial intelligence infrastructure.'
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      price: '$182.10',
      pe: '24.1',
      summary: 'Search engine, cloud platforms, DeepMind AI research, and digital advertising.'
    },
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: '$232.00',
      pe: '33.4',
      summary: 'Consumer electronics, iPhone, Apple Silicon chips, and digital service subscriptions.'
    }
  ];

  const urls = targets.map((t) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>${t.symbol} Financials & Research</title></head>
        <body>
          <h1>${t.name} (${t.symbol})</h1>
          <p class="summary">${t.summary}</p>
          <table id="metrics">
            <thead>
              <tr><th>Metric</th><th>Value</th></tr>
            </thead>
            <tbody>
              <tr><td>Share Price</td><td>${t.price}</td></tr>
              <tr><td>P/E Ratio</td><td>${t.pe}</td></tr>
            </tbody>
          </table>
          <ul id="key_links">
            <li><a href="https://finance.example.com/${t.symbol.toLowerCase()}">Financial Statements</a></li>
            <li><a href="https://sec.example.com/${t.symbol.toLowerCase()}">SEC Filings</a></li>
          </ul>
        </body>
      </html>
    `;
    return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  });

  console.log(`Dispatched ${urls.length} pages to Parallel Tab Scheduler (Max Concurrency: 2)...\n`);
  const startTime = Date.now();

  const results = await browser.mapPages(
    urls,
    async (page, url) => {
      // 1. Extract semantic summary
      const summary = await page.getSummary();

      // 2. Extract financial metrics table
      const metrics = await page.extractTable('#metrics');

      // 3. Extract links
      const links = await page.extractLinks();

      return {
        title: summary.title,
        mainHeading: summary.headings[0],
        metrics: metrics,
        links: links.map((l) => l.href)
      };
    },
    { maxConcurrency: 2 }
  );

  const totalDuration = Date.now() - startTime;
  console.log(`✅ Parallel execution completed in ${totalDuration}ms across all pages!\n`);

  console.log('📊 Consolidated Research Report:');
  results.forEach((r, idx) => {
    if (r.success && r.data) {
      console.log(`\n[PAGE ${idx + 1}] ${r.data.mainHeading}`);
      console.log(`  Duration: ${r.durationMs}ms`);
      console.log(`  Metrics Table:`, r.data.metrics);
      console.log(`  Key Links:`, r.data.links);
    }
  });

  await browser.close();
}

runParallelResearch().catch(console.error);
