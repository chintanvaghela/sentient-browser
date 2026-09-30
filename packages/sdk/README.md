# @sentient-browser/sdk

[![npm](https://img.shields.io/npm/v/@sentient-browser/sdk)](https://www.npmjs.com/package/@sentient-browser/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../../LICENSE)

> TypeScript/JavaScript WebSocket client SDK for [Sentient Browser](https://github.com/chintanvaghela/sentient-browser) — the AI-native browser runtime that replaces brittle HTML scraping with compact Semantic DOM, deterministic settlement, and incremental state diffs.

---

## 📦 Install

```bash
npm install @sentient-browser/sdk
```

**Prerequisites:** A running Sentient Browser server:
```bash
npx @sentient-browser/cli serve --port 9222
```

---

## 🚀 Quick Start

```typescript
import { SentientClient } from '@sentient-browser/sdk';

async function main() {
  const client = await SentientClient.connect({ url: 'ws://127.0.0.1:9222' });
  const page = await client.newPage();

  // Subscribe to incremental state diffs (< 100 tokens per action)
  client.onDiff((diff) => console.log('Mutation Diff:', diff.compact));

  // Navigate with deterministic settlement — no sleep() needed
  const snapshot = await page.goto('https://news.ycombinator.com');
  console.log(`Loaded: ${snapshot.title} (${snapshot.interactiveCount} targets)`);

  // Click by stable semantic ID, button text, or CSS selector
  const diff = await page.click('comments_link');
  console.log('State changed:', diff.compact);

  // Fill an input by placeholder or label
  await page.fill('Search', 'typescript');

  // Solve a goal autonomously
  const result = await page.solve('Find the top story on Hacker News');
  console.log('Answer:', result.answer);

  // Rollback the last action
  await page.rollback();

  // Extract structured data
  const links = await page.extract('links');
  const summary = await page.extract('summary');

  await page.close();
  await client.close();
}

main();
```

---

## 🔑 Key Features

| Feature | Benefit |
|---|---|
| **`page.goto(url)`** | Deterministic settlement — returns only when the page is fully stable |
| **`page.click(target)`** | Stable semantic IDs — works even after DOM changes |
| **`page.fill(label, value)`** | Match by accessibility label or placeholder |
| **`page.solve(goal)`** | Autonomous multi-step goal solver |
| **`page.rollback()`** | Undo last action: form reset, back navigation, modal close |
| **`page.extract(type)`** | Structured JSON: `links`, `summary`, `tables`, `lists` |
| **`client.onDiff(cb)`** | Subscribe to incremental mutation diffs (<100 tokens) |
| **`page.snapshot()`** | Full semantic snapshot with stable IDs and coordinates |
| **`page.screenshot()`** | High-resolution JPEG viewport capture |

---

## 📊 Token Savings vs Raw HTML

| Operation | Raw Chromium | Sentient Browser | Savings |
|---|---|---|---|
| Page load | 15,000 – 40,000 tokens | **600 – 1,800 tokens** | **>88%** |
| Per interaction | 15,000 tokens (full re-dump) | **40 – 150 tokens (diff)** | **>98%** |

---

## 🔗 Related Packages

| Package | Purpose |
|---|---|
| [`@sentient-browser/core`](https://www.npmjs.com/package/@sentient-browser/core) | Runtime engine (server-side) |
| [`@sentient-browser/mcp`](https://www.npmjs.com/package/@sentient-browser/mcp) | MCP server for Claude, Cursor, Windsurf |
| [`@sentient-browser/cli`](https://www.npmjs.com/package/@sentient-browser/cli) | CLI — `sentient serve`, `act`, `repl` |
| [`@sentient-browser/test`](https://www.npmjs.com/package/@sentient-browser/test) | Playwright & Vitest test adapter |

---

## 📜 License

[MIT](../../LICENSE) © Sentient Browser Contributors
