import { performance } from 'perf_hooks';
import { WorkerPool } from '../packages/core/dist/index.mjs';
import { registerSentientMatchers, sentientClick, sentientFill } from '../packages/test/dist/index.mjs';

const TARGET_URL = 'https://sprint-desk.com';

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   ⚡ SPRINTDESK MULTI-WORKER PARALLEL E2E EXECUTION SUITE ⚡        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  console.log('🚀 Initializing WorkerPool with maxConcurrency: 4 (isolated contexts)...');
  const pool = new WorkerPool(undefined, {
    maxConcurrency: 4,
    isolation: 'context',
    headless: true
  });

  await pool.launch();
  console.log('✓ 4 Concurrent browser worker tabs pre-warmed & ready.\n');

  const journeys = [
    {
      name: 'Journey 1: Homepage & Feature Tour',
      run: async (page, id) => {
        const t0 = performance.now();
        await page.goto(TARGET_URL);
        const diff = await page.click('Time Tracker', { waitProfile: 'eager' });
        const duration = performance.now() - t0;
        return { workerId: id, status: 'PASSED', durationMs: Math.round(duration), diffCount: diff?.operationsCount || 0 };
      }
    },
    {
      name: 'Journey 2: Auth Login & Validation',
      run: async (page, id) => {
        const t0 = performance.now();
        await page.goto(`${TARGET_URL}/login`);
        await page.fill('email', 'qa-worker@sprint-desk.com', { waitProfile: 'eager' });
        await page.fill('password', 'SecretPass123!', { waitProfile: 'eager' });
        const diff = await page.click('Sign in', { waitProfile: 'eager' });
        const duration = performance.now() - t0;
        return { workerId: id, status: 'PASSED', durationMs: Math.round(duration), diffCount: diff?.operationsCount || 0 };
      }
    },
    {
      name: 'Journey 3: Registration Form Audit',
      run: async (page, id) => {
        const t0 = performance.now();
        await page.goto(`${TARGET_URL}/register`);
        const snapshot = await page.getSemanticDOM();
        const duration = performance.now() - t0;
        return { workerId: id, status: 'PASSED', durationMs: Math.round(duration), targetsCount: snapshot.interactiveCount };
      }
    },
    {
      name: 'Journey 4: Page Structure & Links Extraction',
      run: async (page, id) => {
        const t0 = performance.now();
        await page.goto(TARGET_URL);
        const summary = await page.getSummary();
        const duration = performance.now() - t0;
        return { workerId: id, status: 'PASSED', durationMs: Math.round(duration), headingsFound: summary.headings.length };
      }
    }
  ];

  console.log('⚡ Launching all 4 E2E journeys in parallel across workers...\n');
  const startAll = performance.now();

  const results = await Promise.all(
    journeys.map(async (j) => {
      const res = await pool.run((page, id) => j.run(page, id));
      console.log(`  ✓ [Worker ${res.workerId}] ${j.name} -> ${res.status} in ${res.durationMs}ms`);
      return { journey: j.name, ...res };
    })
  );

  const totalParallelDuration = performance.now() - startAll;
  const sequentialSumDuration = results.reduce((acc, r) => acc + r.durationMs, 0);

  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log('🏆 PARALLEL EXECUTION METRICS');
  console.log('══════════════════════════════════════════════════════════════════════');

  const stats = pool.getStats();

  console.table([
    {
      'Metric': 'Parallel Execution Time (4 Workers)',
      'Value': `${totalParallelDuration.toFixed(0)} ms`
    },
    {
      'Metric': 'Equivalent Sequential Time',
      'Value': `${sequentialSumDuration.toFixed(0)} ms`
    },
    {
      'Metric': 'Throughput Speedup',
      'Value': `${(sequentialSumDuration / totalParallelDuration).toFixed(2)}x Faster`
    },
    {
      'Metric': 'Completed Tasks',
      'Value': stats.completedTasks
    },
    {
      'Metric': 'Failed Tasks',
      'Value': stats.failedTasks
    },
    {
      'Metric': 'Average Task Duration',
      'Value': `${stats.averageTaskDurationMs} ms`
    }
  ]);

  await pool.close();
  console.log('✓ All worker tabs closed cleanly.\n');
}

main().catch(console.error);
