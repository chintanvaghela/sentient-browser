import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ChromiumManager, SentientPage } from '../src/browser/chromium.js';
import { SemanticCache } from '../src/memory/cache.js';

describe('SemanticCache & AutonomousPlanner', () => {
  let manager: ChromiumManager;
  let page: SentientPage;

  beforeAll(async () => {
    manager = new ChromiumManager();
    await manager.launch({ headless: true });
    page = await manager.newPage();
  });

  afterAll(async () => {
    await manager.close();
  });

  describe('SemanticCache', () => {
    it('caches snapshots and tracks hit rate', () => {
      const cache = new SemanticCache({ defaultTtlMs: 1000, maxEntries: 2 });
      const dummySnapshot: any = { url: 'https://example.com/test', title: 'Test', nodes: [] };

      expect(cache.get('https://example.com/test')).toBeNull();

      cache.set('https://example.com/test', dummySnapshot);
      expect(cache.has('https://example.com/test')).toBe(true);

      const hit = cache.get('https://example.com/test');
      expect(hit?.title).toBe('Test');

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);

      cache.clear();
      expect(cache.has('https://example.com/test')).toBe(false);
    });
  });

  describe('AutonomousPlanner', () => {
    it('autonomously solves a multi-step objective using heuristic navigation', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>SaaS Portal</title></head>
          <body>
            <h1>Welcome to CloudHub</h1>
            <button id="view_pricing_button" onclick="document.getElementById('plans').style.display='block'">View Pricing</button>
            <div id="plans" style="display: none;">
              <h2>Starter Plan</h2>
              <p>Starter: 1 Team Member included free</p>
            </div>
          </body>
        </html>
      `;
      await page.goto(`data:text/html,${encodeURIComponent(html)}`);

      // Solve goal autonomously without any LLM key
      const result = await page.solve({
        goal: 'Find how many users or team members are in the starter plan',
        maxSteps: 5
      });

      expect(result.success).toBe(true);
      expect(result.stepsCount).toBeGreaterThan(0);
      expect(result.answer?.toLowerCase()).toMatch(/starter|team member/);
    });

    it('executes autonomous reasoning with pluggable LLM caller', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <body>
            <h1>Dashboard</h1>
            <p>Active Users: 4,281</p>
          </body>
        </html>
      `;
      await page.goto(`data:text/html,${encodeURIComponent(html)}`);

      const mockLlm = async (prompt: string) => {
        return JSON.stringify({
          reasoning: 'I inspected the active users count directly on the dashboard',
          action: {
            type: 'finish',
            answer: '4,281 Active Users'
          }
        });
      };

      const result = await page.solve({
        goal: 'What is the number of active users?',
        llmCaller: mockLlm
      });

      expect(result.success).toBe(true);
      expect(result.answer).toBe('4,281 Active Users');
      expect(result.stepsCount).toBe(1);
    });
  });
});
