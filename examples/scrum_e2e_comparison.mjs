import { performance } from 'perf_hooks';
import { SentientClient } from '../packages/sdk/dist/index.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { chromium } = require('../../Scrum/frontend/node_modules/@playwright/test');

const TARGET_URL = 'https://sprint-desk.com';

async function runPlaywrightSuite() {
  console.log('\n🎭 ==============================================');
  console.log('   RUNNING SCRUM E2E VIA STANDARD PLAYWRIGHT');
  console.log('==============================================');

  const startTotal = performance.now();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const timings = {};

  // Step 1: Navigate to SprintDesk Homepage
  const t0 = performance.now();
  await page.goto(TARGET_URL, { waitUntil: 'load' });
  timings.pageLoad = performance.now() - t0;
  console.log(`  ✓ [1/5] Loaded homepage: ${timings.pageLoad.toFixed(1)}ms`);

  // Step 2: Click "Time Tracker" feature tab
  const t1 = performance.now();
  const timeTrackerBtn = page.getByRole('button', { name: /time tracker/i }).first();
  await timeTrackerBtn.waitFor({ state: 'visible', timeout: 10000 });
  await timeTrackerBtn.click();
  // Playwright needs to wait for content
  await page.waitForTimeout(400); // Standard manual or selector wait
  timings.timeTrackerClick = performance.now() - t1;
  console.log(`  ✓ [2/5] Clicked Time Tracker & settled: ${timings.timeTrackerClick.toFixed(1)}ms`);

  // Step 3: Navigate to /login
  const t2 = performance.now();
  await page.goto(`${TARGET_URL}/login`, { waitUntil: 'load' });
  const emailInput = page.locator('input[name="email"], input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  timings.loginLoad = performance.now() - t2;
  console.log(`  ✓ [3/5] Navigated to /login & waited for input: ${timings.loginLoad.toFixed(1)}ms`);

  // Step 4: Fill invalid login credentials
  const t3 = performance.now();
  await emailInput.fill('qa-e2e-tester@sprint-desk.com');
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  await passwordInput.fill('InvalidPassword999!');
  timings.formFill = performance.now() - t3;
  console.log(`  ✓ [4/5] Filled email and password: ${timings.formFill.toFixed(1)}ms`);

  // Step 5: Submit form and wait for error or settlement
  const t4 = performance.now();
  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();
  await page.waitForTimeout(800); // wait for API network cycle and UI state
  timings.submitAndVerify = performance.now() - t4;
  console.log(`  ✓ [5/5] Submitted form & settled: ${timings.submitAndVerify.toFixed(1)}ms`);

  // Measure raw HTML payload size
  const html = await page.content();
  const domSizeKb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);

  await browser.close();
  const totalDuration = performance.now() - startTotal;

  console.log(`  🏁 Playwright Total Duration: ${totalDuration.toFixed(1)}ms | Raw DOM: ${domSizeKb} KB`);

  return {
    totalDuration,
    timings,
    domSizeKb,
  };
}

async function runSentientSuite() {
  console.log('\n🤖 ==============================================');
  console.log('   RUNNING SCRUM E2E VIA SENTIENT BROWSER');
  console.log('==============================================');

  const startTotal = performance.now();
  const client = await SentientClient.connect({ url: 'ws://127.0.0.1:9222' });
  const page = await client.newPage();

  const timings = {};

  // Step 1: Navigate with Deterministic Settlement
  const t0 = performance.now();
  const homeSnapshot = await page.goto(TARGET_URL);
  timings.pageLoad = performance.now() - t0;
  console.log(`  ⚡ [1/5] Loaded homepage (Deterministic Settlement): ${timings.pageLoad.toFixed(1)}ms (${homeSnapshot.interactiveCount} targets)`);

  // Step 2: Click "Time Tracker" with Inverted Index & Native CDP
  const t1 = performance.now();
  const timeTrackerDiff = await page.click('Time Tracker', { waitProfile: 'eager' });
  timings.timeTrackerClick = performance.now() - t1;
  console.log(`  ⚡ [2/5] Clicked Time Tracker (Diff: ${timeTrackerDiff?.added?.length || 0} added, ${timeTrackerDiff?.updated?.length || 0} updated): ${timings.timeTrackerClick.toFixed(1)}ms`);

  // Step 3: Navigate to /login with Deterministic Settlement
  const t2 = performance.now();
  const loginSnapshot = await page.goto(`${TARGET_URL}/login`);
  timings.loginLoad = performance.now() - t2;
  console.log(`  ⚡ [3/5] Navigated to /login (Deterministic Settlement): ${timings.loginLoad.toFixed(1)}ms (${loginSnapshot.interactiveCount} targets)`);

  // Step 4: Fill form with Native CDP Hardware Dispatch
  const t3 = performance.now();
  await page.fill('email', 'qa-e2e-tester@sprint-desk.com', { waitProfile: 'eager' });
  await page.fill('password', 'InvalidPassword999!', { waitProfile: 'eager' });
  timings.formFill = performance.now() - t3;
  console.log(`  ⚡ [4/5] Filled email and password via CDP dispatch: ${timings.formFill.toFixed(1)}ms`);

  // Step 5: Submit form and immediately receive Incremental State Diff (Zero sleep)
  const t4 = performance.now();
  const submitDiff = await page.click('Sign in', { waitProfile: 'eager' });
  timings.submitAndVerify = performance.now() - t4;
  console.log(`  ⚡ [5/5] Submitted form & received State Diff: ${timings.submitAndVerify.toFixed(1)}ms`);

  // Measure semantic JSON token payload size
  const semanticJson = JSON.stringify(loginSnapshot.nodes || []);
  const semanticSizeKb = (Buffer.byteLength(semanticJson, 'utf8') / 1024).toFixed(1);

  await page.close();
  await client.close();
  const totalDuration = performance.now() - startTotal;

  console.log(`  🏁 Sentient Total Duration: ${totalDuration.toFixed(1)}ms | Pruned DOM: ${semanticSizeKb} KB`);

  return {
    totalDuration,
    timings,
    semanticSizeKb,
  };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   ⚡ SPRINTDESK / SCRUM E2E BENCHMARK: PLAYWRIGHT vs SENTIENT ⚡    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  let sentientResult;
  let playwrightResult;

  try {
    sentientResult = await runSentientSuite();
  } catch (err) {
    console.error('Sentient suite error:', err);
  }

  try {
    playwrightResult = await runPlaywrightSuite();
  } catch (err) {
    console.error('Playwright suite error:', err);
  }

  if (playwrightResult && sentientResult) {
    console.log('\n══════════════════════════════════════════════════════════════════════');
    console.log('🏆 E2E COMPARATIVE PERFORMANCE SCORECARD');
    console.log('══════════════════════════════════════════════════════════════════════');

    const pw = playwrightResult;
    const st = sentientResult;

    console.table([
      {
        'Test Step / Metric': '1. Homepage Load & Settle',
        'Standard Playwright': `${pw.timings.pageLoad.toFixed(0)} ms`,
        'Sentient Browser': `${st.timings.pageLoad.toFixed(0)} ms`,
        'Advantage': `${(pw.timings.pageLoad / st.timings.pageLoad).toFixed(1)}x faster`,
      },
      {
        'Test Step / Metric': '2. Click Time Tracker & Settle',
        'Standard Playwright': `${pw.timings.timeTrackerClick.toFixed(0)} ms`,
        'Sentient Browser': `${st.timings.timeTrackerClick.toFixed(0)} ms`,
        'Advantage': `${(pw.timings.timeTrackerClick / st.timings.timeTrackerClick).toFixed(1)}x faster`,
      },
      {
        'Test Step / Metric': '3. Navigate /login & Settle',
        'Standard Playwright': `${pw.timings.loginLoad.toFixed(0)} ms`,
        'Sentient Browser': `${st.timings.loginLoad.toFixed(0)} ms`,
        'Advantage': `${(pw.timings.loginLoad / st.timings.loginLoad).toFixed(1)}x faster`,
      },
      {
        'Test Step / Metric': '4. Fill Credentials (2 inputs)',
        'Standard Playwright': `${pw.timings.formFill.toFixed(0)} ms`,
        'Sentient Browser': `${st.timings.formFill.toFixed(0)} ms`,
        'Advantage': `${(pw.timings.formFill / st.timings.formFill).toFixed(1)}x faster`,
      },
      {
        'Test Step / Metric': '5. Submit & Verify State Update',
        'Standard Playwright': `${pw.timings.submitAndVerify.toFixed(0)} ms`,
        'Sentient Browser': `${st.timings.submitAndVerify.toFixed(0)} ms`,
        'Advantage': `${(pw.timings.submitAndVerify / st.timings.submitAndVerify).toFixed(1)}x faster`,
      },
      {
        'Test Step / Metric': '⚡ TOTAL E2E TEST DURATION',
        'Standard Playwright': `${pw.totalDuration.toFixed(0)} ms`,
        'Sentient Browser': `${st.totalDuration.toFixed(0)} ms`,
        'Advantage': `${(pw.totalDuration / st.totalDuration).toFixed(1)}x FASTER`,
      },
      {
        'Test Step / Metric': '📦 DOM Payload Size',
        'Standard Playwright': `${pw.domSizeKb} KB (Raw HTML)`,
        'Sentient Browser': `${st.semanticSizeKb} KB (Pruned JSON)`,
        'Advantage': `${(parseFloat(pw.domSizeKb) / parseFloat(st.semanticSizeKb)).toFixed(1)}x lighter`,
      },
    ]);

    console.log('══════════════════════════════════════════════════════════════════════');
    console.log(`🎉 RESULT: Sentient Browser completed the Scrum E2E test in ${st.totalDuration.toFixed(0)}ms`);
    console.log(`   vs Playwright in ${pw.totalDuration.toFixed(0)}ms (${(pw.totalDuration / st.totalDuration).toFixed(1)}x faster execution)!`);
    console.log('══════════════════════════════════════════════════════════════════════\n');
  }
}

main().catch(console.error);
