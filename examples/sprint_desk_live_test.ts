import { SentientBrowser } from '../packages/sdk/dist/index.mjs';

/**
 * Real-world live demonstration testing SprintDesk (https://sprint-desk.com)
 * Demonstrates:
 * 1. Live page navigation and wait settlement
 * 2. Pruned Semantic DOM extraction with Stable IDs
 * 3. Intent click on "Time Tracker" feature tab
 * 4. Streaming state diff observation (detecting live timer mount & sprint section unmount)
 * 5. Structured page summary extraction
 */
async function testSprintDesk() {
  console.log('🚀 Launching Sentient Browser...');
  const browser = await SentientBrowser.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Navigating to https://sprint-desk.com...');
  const snapshot = await page.goto('https://sprint-desk.com');

  console.log('\n======================================================');
  console.log(`Page Title: ${snapshot.title}`);
  console.log(`URL:        ${snapshot.url}`);
  console.log(`Total Nodes: ${snapshot.totalNodes} (${snapshot.interactiveCount} interactive)`);
  console.log('======================================================\n');

  console.log('--- Sample Interactive Elements Found ---');
  snapshot.nodes
    .filter((n) => n.clickable || n.role === 'button' || n.role === 'link')
    .slice(0, 10)
    .forEach((n) => {
      console.log(`• [${n.role.toUpperCase()}] id="${n.id}" -> "${n.text || n.placeholder}"`);
    });

  console.log('\nExecuting Intent: Click "Time Tracker" button (id="time_tracker_button")...');
  const diff = await page.click('time_tracker_button');

  console.log('\n📊 Real-Time State Diff Detected:');
  console.log(diff.compact);

  console.log('\nExtracting Structured Page Summary...');
  const summary = await page.getSummary();
  console.log(`• Headings: ${summary.headings.slice(0, 5).join(' | ')}`);
  console.log(`• Top Links Count: ${summary.topLinks.length}`);

  await browser.close();
  console.log('\n✓ Live test complete!');
}

testSprintDesk().catch(console.error);
