# @sentient-browser/core

[![npm](https://img.shields.io/npm/v/@sentient-browser/core)](https://www.npmjs.com/package/@sentient-browser/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../../LICENSE)

> The AI-Native Browser Runtime Engine — CDP driver, pruned Semantic DOM, deterministic settlement, incremental state diffs, WorkerPool, and autonomous goal planner.

This is the **core engine** of [Sentient Browser](https://github.com/chintanvaghela/sentient-browser). You typically consume it via [`@sentient-browser/sdk`](https://www.npmjs.com/package/@sentient-browser/sdk) or the [`@sentient-browser/cli`](https://www.npmjs.com/package/@sentient-browser/cli) — use this package directly only when you need low-level runtime access.

---

## ⚡ What's Inside

| Feature | Description |
|---|---|
| **CDP Driver** | Native Chrome DevTools Protocol — real hardware-level mouse & keyboard events |
| **Semantic DOM Pruner** | Strips invisible/layout nodes → compact JSON with 30–40 actionable targets (70–90% token reduction) |
| **Deterministic Settlement** | Multi-signal sync: CDP network quiet + DOM mutations + RAF flush + framework pending queues |
| **Stable Semantic IDs** | Element IDs from accessibility labels, test IDs, and semantic roles — never break on DOM changes |
| **Incremental State Diffs** | `added / removed / updated` mutation broadcast after every action (>98% fewer tokens than full HTML) |
| **WorkerPool** | Multi-tab/context parallel browser pool with concurrency gating and automatic worker recycling |
| **Autonomous Planner** | Heuristic + LLM-compatible goal solver (`sentient act <url> "<goal>"`) |
| **Action Rollback** | Reverts form values, navigation, and modal states with automatic inverse operations |
| **Real-Time Screencast** | 15–20 FPS CDP Page.startScreencast stream for live visual oversight |

---

## 📦 Install

```bash
npm install @sentient-browser/core
```

---

## 🚀 Quick Start

```typescript
import { SentientRuntime, WorkerPool } from '@sentient-browser/core';

// Start the runtime server
const runtime = new SentientRuntime({ port: 9222 });
await runtime.start();

// Multi-worker parallel pool
const pool = new WorkerPool(undefined, {
  maxConcurrency: 4,
  isolation: 'context',
  recycleAfterTasks: 25,
});

const results = await pool.map(urls, async (url, page) => {
  await page.goto(url);
  return page.getSummary();
});

await pool.close();
await runtime.stop();
```

---

## ⚡ DSA Micro-Benchmarks

| Benchmark | Naive Approach | DSA Optimized | Speedup |
|---|---|---|---|
| **State Diff Checks** | 20,275 batches/sec | **39,090 batches/sec** | **~2x** |
| **Viewport Hit-Testing** | 245,783 queries/sec | **752,525 queries/sec** | **3.1x** |
| **Candidate Ranking** | 493 sorts/sec | **13,028 heaps/sec** | **26.4x** |

---

## 🔗 Related Packages

| Package | Purpose |
|---|---|
| [`@sentient-browser/sdk`](https://www.npmjs.com/package/@sentient-browser/sdk) | TypeScript/JS WebSocket client SDK |
| [`@sentient-browser/mcp`](https://www.npmjs.com/package/@sentient-browser/mcp) | MCP server for Claude, Cursor, Windsurf |
| [`@sentient-browser/cli`](https://www.npmjs.com/package/@sentient-browser/cli) | CLI — `sentient serve`, `act`, `repl` |
| [`@sentient-browser/test`](https://www.npmjs.com/package/@sentient-browser/test) | Playwright & Vitest test adapter |

---

## 📜 License

[MIT](../../LICENSE) © Sentient Browser Contributors
