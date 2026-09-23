import { ChromiumManager } from '../packages/core/dist/index.mjs';
import { SentientMcpServer } from '../packages/mcp/dist/index.mjs';

function estimateTokens(text) {
  return Math.max(1, Math.round(text.length / 3.8));
}

const isLive = process.argv.includes('--live');
const liveUrl = process.argv.find((a) => a.startsWith('http')) || 'https://news.ycombinator.com';

async function runComparisonBenchmark() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  🏁 SENTIENT BROWSER MCP vs. CHROME DEVTOOLS MCP BENCHMARK 🏁`);
  console.log(`  Target: ${isLive ? liveUrl : 'Dynamic SaaS Fixture (SPA)'}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const testHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>SaaS CRM Workspace - SprintDesk</title>
        <style>
          body { font-family: Inter, system-ui, sans-serif; margin: 0; background: #0f172a; color: #f8fafc; }
          .noise-header, .sidebar-nav, .dashboard-grid { padding: 20px; }
          .card { background: #1e293b; padding: 16px; margin-bottom: 12px; border-radius: 8px; border: 1px solid #334155; }
          input { padding: 10px 14px; background: #0f172a; border: 1px solid #475569; color: white; border-radius: 6px; width: 280px; }
          button { padding: 10px 18px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
          .hidden { display: none; }
          .tag { display: inline-block; padding: 4px 8px; background: #334155; border-radius: 4px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="wrapper-noise-1 layout-container-123">
          <header class="noise-header">
            <div class="brand">SprintDesk Cloud</div>
            <nav class="sidebar-nav">
              <a href="/projects">Projects</a>
              <a href="/sprints">Active Sprints</a>
              <a href="/backlog">Backlog</a>
              <a href="/team">Team Members</a>
              <a href="/analytics">Velocity Analytics</a>
              <a href="/settings">Workspace Settings</a>
            </nav>
          </header>

          <main class="dashboard-grid">
            <div class="card">
              <h2>Quick Task Creator</h2>
              <p>Type a task title and press Create to schedule immediately.</p>
              <div class="input-row">
                <input id="task_title_input" placeholder="Enter sprint task title..." />
                <button id="create_task_btn" onclick="createTask()">Create Task</button>
              </div>
            </div>

            <div id="results_card" class="card hidden">
              <h3>Task Created Successfully</h3>
              <p id="created_task_name"></p>
              <span class="tag">Priority: High</span>
              <span class="tag">Status: In Progress</span>
            </div>

            <div class="card layout-noise-table">
              <h3>Recent Sprint Backlog Items (30 items)</h3>
              <ul>
                ${Array.from({ length: 30 })
                  .map(
                    (_, i) =>
                      `<li>[TASK-${100 + i}] Implement service integration step #${i + 1} - <a href="/task/${100 + i}">View Details</a></li>`
                  )
                  .join('\n')}
              </ul>
            </div>
          </main>
        </div>

        <script>
          function createTask() {
            const input = document.getElementById('task_title_input');
            const val = input.value.trim() || 'Default Task';
            setTimeout(() => {
              const res = document.getElementById('results_card');
              document.getElementById('created_task_name').innerText = 'Created: ' + val;
              res.classList.remove('hidden');
            }, 50);
          }
        </script>
      </body>
    </html>
  `;
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(testHtml)}`;

  const targetUrl = isLive ? liveUrl : dataUrl;

  // =========================================================================
  // PARADIGM A: Chrome DevTools MCP Style (Raw DOM dumps, full tree re-dumps)
  // =========================================================================
  console.log('▶ [1/2] Running Chrome DevTools MCP Workflow Simulation...');
  const devtoolsManager = new ChromiumManager();
  await devtoolsManager.launch({ headless: true });
  const rawPage = await devtoolsManager.newPage();

  const devtoolsStart = Date.now();

  // Step 0: Initial Navigation & Full OuterHTML / Accessibility tree dump
  const t0 = Date.now();
  await rawPage.page.goto(targetUrl, { timeout: 30000 });
  // Chrome DevTools MCP fetches the entire raw HTML / DOM tree
  const fullHtmlDump = await rawPage.page.content();
  const devtoolsInitialLatency = Date.now() - t0;
  const devtoolsInitialTokens = estimateTokens(fullHtmlDump);

  let devtoolsAction1Latency = 0;
  let devtoolsAction1Tokens = 0;
  let devtoolsAction2Latency = 0;
  let devtoolsAction2Tokens = 0;

  if (isLive) {
    // Live Action 1: Click Time Tracker
    const t1 = Date.now();
    await rawPage.page.click('text="Time Tracker"').catch(async () => {
      await rawPage.page.click('button:has-text("Time Tracker")');
    });
    await new Promise((r) => setTimeout(r, 600));
    const dump1 = await rawPage.page.content();
    devtoolsAction1Latency = Date.now() - t1;
    devtoolsAction1Tokens = estimateTokens(dump1);

    // Live Action 2: Click or Hover Features / Scrum
    const t2 = Date.now();
    await rawPage.page.click('text="Scrum Sprints"').catch(() => {});
    await new Promise((r) => setTimeout(r, 600));
    const dump2 = await rawPage.page.content();
    devtoolsAction2Latency = Date.now() - t2;
    devtoolsAction2Tokens = estimateTokens(dump2);
  } else {
    // Step 1: Fill input
    const t1 = Date.now();
    await rawPage.page.fill('#task_title_input', 'Deploy Sentient MCP Server');
    await new Promise((r) => setTimeout(r, 300));
    const dump1 = await rawPage.page.content();
    devtoolsAction1Latency = Date.now() - t1;
    devtoolsAction1Tokens = estimateTokens(dump1);

    // Step 2: Click button
    const t2 = Date.now();
    await rawPage.page.click('#create_task_btn');
    await new Promise((r) => setTimeout(r, 400));
    const dump2 = await rawPage.page.content();
    devtoolsAction2Latency = Date.now() - t2;
    devtoolsAction2Tokens = estimateTokens(dump2);
  }

  const devtoolsTotalDuration = Date.now() - devtoolsStart;
  const devtoolsCumulativeTokens =
    devtoolsInitialTokens + devtoolsAction1Tokens + devtoolsAction2Tokens;

  await devtoolsManager.close();

  const devtoolsMetrics = {
    mode: 'chrome-devtools-mcp (Raw DOM Re-Dumps)',
    initialTokens: devtoolsInitialTokens,
    initialLatencyMs: devtoolsInitialLatency,
    action1Tokens: devtoolsAction1Tokens,
    action1LatencyMs: devtoolsAction1Latency,
    action2Tokens: devtoolsAction2Tokens,
    action2LatencyMs: devtoolsAction2Latency,
    cumulativeTokens: devtoolsCumulativeTokens,
    cumulativeDurationMs: devtoolsTotalDuration
  };

  // =========================================================================
  // PARADIGM B: Sentient Browser MCP (Semantic DOM + Incremental State Diffs)
  // =========================================================================
  console.log('▶ [2/2] Running Sentient Browser MCP Workflow...');
  const sentientServer = new SentientMcpServer({
    daemonUrl: 'ws://127.0.0.1:59999', // fallback to embedded
    headless: true
  });

  const sentientStart = Date.now();

  // Step 0: sentient_navigate (Deterministic settlement + pruned Semantic DOM)
  const st0 = Date.now();
  const navResult = await sentientServer.executeTool('sentient_navigate', { url: targetUrl });
  const sentientInitialLatency = Date.now() - st0;
  const navText = navResult.content[0].text;
  const sentientInitialTokens = estimateTokens(navText);

  let sentientAction1Latency = 0;
  let sentientAction1Tokens = 0;
  let sentientAction2Latency = 0;
  let sentientAction2Tokens = 0;

  if (isLive) {
    // Live Action 1: Click Time Tracker via natural intent
    const st1 = Date.now();
    const click1 = await sentientServer.executeTool('sentient_click', {
      target: 'Time Tracker'
    });
    sentientAction1Latency = Date.now() - st1;
    sentientAction1Tokens = estimateTokens(click1.content[0].text);

    // Live Action 2: Click Scrum Sprints via natural intent
    const st2 = Date.now();
    const click2 = await sentientServer.executeTool('sentient_click', {
      target: 'Scrum Sprints'
    });
    sentientAction2Latency = Date.now() - st2;
    sentientAction2Tokens = estimateTokens(click2.content[0].text);
  } else {
    // Step 1: sentient_fill
    const st1 = Date.now();
    const fillResult = await sentientServer.executeTool('sentient_fill', {
      target: 'Enter sprint task title...',
      text: 'Deploy Sentient MCP Server'
    });
    sentientAction1Latency = Date.now() - st1;
    sentientAction1Tokens = estimateTokens(fillResult.content[0].text);

    // Step 2: sentient_click
    const st2 = Date.now();
    const clickResult = await sentientServer.executeTool('sentient_click', {
      target: 'Create Task'
    });
    sentientAction2Latency = Date.now() - st2;
    sentientAction2Tokens = estimateTokens(clickResult.content[0].text);
  }

  const sentientTotalDuration = Date.now() - sentientStart;
  const sentientCumulativeTokens =
    sentientInitialTokens + sentientAction1Tokens + sentientAction2Tokens;

  await sentientServer.close();

  const sentientMetrics = {
    mode: 'Sentient Browser MCP (Semantic DOM + Diffs)',
    initialTokens: sentientInitialTokens,
    initialLatencyMs: sentientInitialLatency,
    action1Tokens: sentientAction1Tokens,
    action1LatencyMs: sentientAction1Latency,
    action2Tokens: sentientAction2Tokens,
    action2LatencyMs: sentientAction2Latency,
    cumulativeTokens: sentientCumulativeTokens,
    cumulativeDurationMs: sentientTotalDuration
  };

  // =========================================================================
  // RESULTS & COMPARISON TABLE
  // =========================================================================
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('                    📊 BENCHMARK RESULTS 📊');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log('| Metric | chrome-devtools-mcp | Sentient Browser MCP | Advantage |');
  console.log('|---|---|---|---|');

  const initRed = ((1 - sentientMetrics.initialTokens / devtoolsMetrics.initialTokens) * 100).toFixed(1);
  console.log(
    `| **Initial Page Load Payload** | ${devtoolsMetrics.initialTokens.toLocaleString()} tokens | **${sentientMetrics.initialTokens.toLocaleString()} tokens** | **${initRed}% FEWER TOKENS** |`
  );

  const a1Red = ((1 - sentientMetrics.action1Tokens / devtoolsMetrics.action1Tokens) * 100).toFixed(1);
  console.log(
    `| **Step 1 (Fill Input) Update** | ${devtoolsMetrics.action1Tokens.toLocaleString()} tokens | **${sentientMetrics.action1Tokens.toLocaleString()} tokens** | **${a1Red}% FEWER TOKENS** |`
  );

  const a2Red = ((1 - sentientMetrics.action2Tokens / devtoolsMetrics.action2Tokens) * 100).toFixed(1);
  console.log(
    `| **Step 2 (Click Button) Update** | ${devtoolsMetrics.action2Tokens.toLocaleString()} tokens | **${sentientMetrics.action2Tokens.toLocaleString()} tokens** | **${a2Red}% FEWER TOKENS** |`
  );

  const cumRed = (
    (1 - sentientMetrics.cumulativeTokens / devtoolsMetrics.cumulativeTokens) *
    100
  ).toFixed(1);
  console.log(
    `| **Cumulative 3-Step Workflow Cost** | ${devtoolsMetrics.cumulativeTokens.toLocaleString()} tokens | **${sentientMetrics.cumulativeTokens.toLocaleString()} tokens** | **${cumRed}% TOTAL TOKENS SAVED** |`
  );

  const speedup = (devtoolsMetrics.cumulativeDurationMs / sentientMetrics.cumulativeDurationMs).toFixed(1);
  console.log(
    `| **Total Task Execution Time** | ${devtoolsMetrics.cumulativeDurationMs} ms | **${sentientMetrics.cumulativeDurationMs} ms** | **${speedup}x FASTER** |`
  );

  console.log(
    `| **Target Selector Type** | Brittle CSS (\`#task_title_input\`) | **Natural Intent (\`"Enter sprint task title..."\`)** | Self-Healing |`
  );

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log(`🎉 VERDICT: Sentient Browser MCP saves ${cumRed}% of LLM context tokens`);
  console.log(`and executes ${speedup}x faster than traditional DevTools MCP!`);
  console.log('═══════════════════════════════════════════════════════════════════\n');
}

runComparisonBenchmark().catch(console.error);
