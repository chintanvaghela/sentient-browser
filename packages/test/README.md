# @sentient-browser/test

[![npm](https://img.shields.io/npm/v/@sentient-browser/test)](https://www.npmjs.com/package/@sentient-browser/test)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../../LICENSE)

> Playwright & Vitest test runner adapter for [Sentient Browser](https://github.com/chintanvaghela/sentient-browser). Drop-in helpers and custom matchers that bring deterministic settlement, stable semantic IDs, and incremental state diffs to your existing test suites — zero flakiness, no `sleep()`.

---

## 📦 Install

```bash
npm install -D @sentient-browser/test
```

---

## 🚀 Usage with Playwright

```typescript
import { test, expect } from '@playwright/test';
import {
  registerSentientMatchers,
  sentientClick,
  sentientFill,
  wrapPlaywrightPage,
} from '@sentient-browser/test';

// Register custom matchers once (e.g. in playwright.config.ts or a setup file)
registerSentientMatchers(expect);

test('Login with zero flakiness', async ({ page }) => {
  const sentientPage = await wrapPlaywrightPage(page);

  await page.goto('https://example.com/login');

  // Wait for full deterministic settlement (no sleep, no arbitrary timeout)
  await expect(sentientPage).toSettle();

  // Fill by accessibility label or placeholder — no CSS selectors needed
  await sentientFill(page, 'Enter your email', 'user@example.com');
  await sentientFill(page, 'Enter your password', 'Password123!');

  // Click and assert state diff in one step
  const diff = await sentientClick(page, 'Sign in');
  expect(diff).toHaveAdded('Dashboard Overview');
});
```

---

## 🧩 Custom Matchers

| Matcher | Description |
|---|---|
| `toSettle()` | Assert the page has reached full deterministic settlement |
| `toHaveAdded(text)` | Assert an element with the given semantic text was added in the diff |
| `toHaveUpdated(id)` | Assert an element was updated in the diff |
| `toHaveSemanticText(text)` | Assert semantic text is present in the current snapshot |

---

## 🛠️ Helper Functions

| Function | Description |
|---|---|
| `wrapPlaywrightPage(page)` | Wrap a Playwright `Page` with Sentient settlement & diff tracking |
| `sentientClick(page, target)` | Click by stable semantic ID or button text; returns state diff |
| `sentientFill(page, label, value)` | Fill input by accessibility label or placeholder |

---

## 🔗 Related Packages

| Package | Purpose |
|---|---|
| [`@sentient-browser/core`](https://www.npmjs.com/package/@sentient-browser/core) | Runtime engine |
| [`@sentient-browser/sdk`](https://www.npmjs.com/package/@sentient-browser/sdk) | TypeScript/JS WebSocket client |
| [`@sentient-browser/mcp`](https://www.npmjs.com/package/@sentient-browser/mcp) | MCP server for Claude, Cursor, Windsurf |
| [`@sentient-browser/cli`](https://www.npmjs.com/package/@sentient-browser/cli) | CLI — `sentient serve`, `act`, `repl` |

---

## 📜 License

[MIT](../../LICENSE) © Sentient Browser Contributors
