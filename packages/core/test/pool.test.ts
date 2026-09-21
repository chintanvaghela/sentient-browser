import { describe, it, expect, afterAll } from 'vitest';
import { WorkerPool } from '../src/pool/index.js';

describe('WorkerPool Parallel Execution Engine', () => {
  let pool: WorkerPool;

  afterAll(async () => {
    if (pool) {
      await pool.close();
    }
  });

  it('provisions workers and executes tasks concurrently with controlled limit', async () => {
    pool = new WorkerPool(undefined, {
      maxConcurrency: 3,
      recycleAfterTasks: 10,
      taskTimeoutMs: 15000,
      headless: true
    });

    await pool.launch();
    const stats = pool.getStats();
    expect(stats.idleWorkers).toBe(3);
    expect(stats.activeWorkers).toBe(0);

    let maxObservedActive = 0;

    // Run 6 concurrent tasks
    const tasks = [1, 2, 3, 4, 5, 6].map((num) => {
      return pool.run(async (page, workerId) => {
        const currentActive = pool.getStats().activeWorkers;
        if (currentActive > maxObservedActive) {
          maxObservedActive = currentActive;
        }

        // Navigate worker page to data URL
        await page.goto(`data:text/html,<html><body><h1>Task ${num} Worker ${workerId}</h1></body></html>`);
        const snapshot = await page.getSemanticDOM();
        const heading = snapshot.nodes.find((n) => n.role === 'heading')?.text || '';

        return { num, workerId, heading };
      });
    });

    const results = await Promise.all(tasks);

    expect(results.length).toBe(6);
    expect(maxObservedActive).toBeLessThanOrEqual(3);
    expect(results[0].heading).toContain('Task 1');
    expect(results[5].heading).toContain('Task 6');

    const endStats = pool.getStats();
    expect(endStats.completedTasks).toBe(6);
    expect(endStats.failedTasks).toBe(0);
    expect(endStats.activeWorkers).toBe(0);
  });

  it('executes batch items in parallel via pool.map', async () => {
    const items = ['Alpha', 'Beta', 'Gamma', 'Delta'];

    const mapped = await pool.map(items, async (item, page) => {
      await page.goto(`data:text/html,<html><body><button>${item}</button></body></html>`);
      const snapshot = await page.getSemanticDOM();
      return snapshot.nodes.find((n) => n.role === 'button')?.text;
    });

    expect(mapped).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
  });

  it('recycles worker after reaching recycleAfterTasks threshold', async () => {
    const recyclePool = new WorkerPool(undefined, {
      maxConcurrency: 1,
      recycleAfterTasks: 2,
      headless: true
    });

    await recyclePool.launch();

    // Task 1
    await recyclePool.run(async (page) => {
      await page.goto('data:text/html,<body><p>1</p></body>');
      return 1;
    });

    // Task 2 (reaches threshold of 2)
    await recyclePool.run(async (page) => {
      await page.goto('data:text/html,<body><p>2</p></body>');
      return 2;
    });

    // Task 3 (should run on recycled worker seamlessly)
    const res = await recyclePool.run(async (page) => {
      await page.goto('data:text/html,<body><p>3</p></body>');
      const snap = await page.getSemanticDOM();
      return snap.nodes.find((n) => n.role === 'text')?.text;
    });

    expect(res).toBe('3');
    await recyclePool.close();
  });
});
