#!/usr/bin/env node
import { Command } from 'commander';
import readline from 'node:readline';
import { SentientServer, ChromiumManager } from '@sentient/core';

const program = new Command();

program
  .name('sentient')
  .description('Sentient Browser: AI-native browser runtime for autonomous agents')
  .version('0.1.0');

program
  .command('serve')
  .description('Start Sentient Browser WebSocket daemon')
  .option('-p, --port <number>', 'Port to listen on', '9222')
  .option('--headful', 'Run with visible browser window', false)
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    const server = new SentientServer({
      port,
      headless: !options.headful
    });

    console.log(`Starting Sentient Browser Daemon on ws://127.0.0.1:${port}...`);
    await server.start();
    console.log(`✓ Sentient Browser is running. Ready for agent connections.`);

    process.on('SIGINT', async () => {
      console.log('\nShutting down Sentient Browser...');
      await server.stop();
      process.exit(0);
    });
  });

program
  .command('run')
  .description('Inspect Semantic DOM of a target webpage')
  .argument('<url>', 'URL to inspect')
  .option('--headful', 'Run with visible browser window', false)
  .action(async (url, options) => {
    const manager = new ChromiumManager();
    console.log(`Launching browser and navigating to ${url}...`);
    await manager.launch({ headless: !options.headful });

    const page = await manager.newPage();
    const snapshot = await page.goto(url);

    console.log(`\n======================================================`);
    console.log(`Page Title: ${snapshot.title}`);
    console.log(`URL:        ${snapshot.url}`);
    console.log(`Nodes:      ${snapshot.totalNodes} (${snapshot.interactiveCount} interactive)`);
    console.log(`======================================================\n`);

    console.log(JSON.stringify(snapshot.nodes, null, 2));

    await manager.close();
  });

program
  .command('act')
  .description('Autonomously execute a natural language goal on a target webpage')
  .argument('<url>', 'Target URL to begin navigation')
  .argument('<goal>', 'Natural language objective to achieve')
  .option('--headful', 'Run with visible browser window', false)
  .option('--max-steps <number>', 'Maximum autonomous steps', '8')
  .action(async (url, goal, options) => {
    const manager = new ChromiumManager();
    console.log(`🤖 Starting Autonomous Planner at ${url}...`);
    console.log(`🎯 Goal: "${goal}"\n`);
    await manager.launch({ headless: !options.headful });

    const page = await manager.newPage();
    await page.goto(url);

    const result = await page.solve({
      goal,
      maxSteps: parseInt(options.maxSteps, 10),
      onStep: (step) => {
        console.log(`[Step ${step.stepNumber}] Action: ${step.action.type.toUpperCase()}${step.action.target ? ' -> ' + step.action.target : ''}`);
        if (step.action.reasoning) console.log(`  Reasoning: ${step.action.reasoning}`);
        if (step.diffSummary) console.log(`  Diff: ${step.diffSummary.split('\n')[0]}`);
      }
    });

    console.log(`\n======================================================`);
    console.log(result.success ? `✓ Goal Completed in ${result.durationMs}ms (${result.stepsCount} steps)` : `✗ Goal Incomplete: ${result.error}`);
    console.log(`======================================================`);
    console.log(`\n📌 Result / Answer:`);
    console.log(result.answer || 'No answer returned.');

    await manager.close();
  });

program
  .command('repl')
  .description('Interactive Sentient REPL to test intent actions live')
  .argument('<url>', 'Initial URL to navigate to')
  .option('--headful', 'Run with visible browser window', true)
  .action(async (url, options) => {
    const manager = new ChromiumManager();
    console.log(`Launching REPL session at ${url}...`);
    await manager.launch({ headless: !options.headful });

    const page = await manager.newPage();
    await page.goto(url);
    console.log(`✓ Page settled. Type 'help' for available commands.\n`);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'sentient> '
    });

    rl.prompt();

    rl.on('line', async (line) => {
      const [cmd, ...args] = line.trim().split(' ');

      try {
        switch (cmd) {
          case 'dom': {
            const dom = await page.getSemanticDOM();
            console.log(JSON.stringify(dom.nodes, null, 2));
            break;
          }
          case 'diff': {
            const diff = await page.getDiff();
            console.log(diff.compact);
            break;
          }
          case 'click': {
            const target = args.join(' ');
            console.log(`Clicking "${target}"...`);
            const diff = await page.click(target);
            console.log(diff.compact);
            break;
          }
          case 'fill': {
            const target = args[0];
            const text = args.slice(1).join(' ');
            console.log(`Filling "${target}" with "${text}"...`);
            const diff = await page.fill(target, text);
            console.log(diff.compact);
            break;
          }
          case 'goto': {
            const newUrl = args[0];
            console.log(`Navigating to ${newUrl}...`);
            await page.goto(newUrl);
            console.log('✓ Page settled.');
            break;
          }
          case 'help': {
            console.log('Available commands:');
            console.log('  dom                      - Display current Semantic DOM');
            console.log('  diff                     - Display incremental state diff');
            console.log('  click <target>           - Click an element by Stable ID or text');
            console.log('  fill <target> <text>     - Fill an input field');
            console.log('  goto <url>               - Navigate to new URL');
            console.log('  exit / quit              - Exit the REPL');
            break;
          }
          case 'exit':
          case 'quit': {
            rl.close();
            return;
          }
          default:
            if (cmd) console.log(`Unknown command: ${cmd}. Type 'help' for command list.`);
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
      }

      rl.prompt();
    });

    rl.on('close', async () => {
      console.log('\nClosing REPL session...');
      await manager.close();
      process.exit(0);
    });
  });

program
  .command('mcp')
  .description('Start Sentient Browser MCP (Model Context Protocol) server over stdio')
  .option('-u, --url <url>', 'Sentient Browser daemon WebSocket URL', 'ws://127.0.0.1:9222')
  .option('--headful', 'Run with visible browser window if spinning up embedded instance', false)
  .action(async (options) => {
    const { SentientMcpServer } = await import('@sentient/mcp');
    const server = new SentientMcpServer({
      daemonUrl: options.url,
      headless: !options.headful
    });
    server.startStdio();

    const cleanup = async () => {
      await server.close();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  });

program.parse(process.argv);
