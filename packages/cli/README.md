# @sentient-browser/cli

[![npm](https://img.shields.io/npm/v/@sentient-browser/cli)](https://www.npmjs.com/package/@sentient-browser/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../../LICENSE)

> Command-line interface for [Sentient Browser](https://github.com/chintanvaghela/sentient-browser) — the AI-native browser runtime. Serve, inspect, automate, and control browsers from your terminal.

---

## 📦 Install

```bash
# Install globally
npm install -g @sentient-browser/cli

# Or use directly with npx
npx @sentient-browser/cli serve --port 9222
```

---

## 🚀 Commands

### `sentient serve` — Start the runtime server

```bash
sentient serve --port 9222
```

Starts the WebSocket server + **Visual Web Inspector** at `http://localhost:9222/`.

The inspector gives you:
- **Action Targets Panel** — interactive cards with `[Click]` / `[Hover]` triggers and a live `🔍 Quick filter`
- **Pruned Semantic DOM Tree** — compact JSON of actionable nodes (copy to clipboard in 1 click)
- **Incremental State Diff Stream** — real-time mutation log
- **Sticky Bottom Action Dock** — autonomous agent solver, direct CDP control, extraction drawers

---

### `sentient run` — Inspect a URL

```bash
sentient run https://news.ycombinator.com
```

Navigates, settles, and prints the pruned **Semantic DOM JSON** — great for debugging what your agent sees.

---

### `sentient act` — Autonomous goal solver

```bash
sentient act https://news.ycombinator.com "Find the top story"
```

Launches the autonomous planner to achieve a natural language objective. Prints each step taken and the final answer.

---

### `sentient repl` — Interactive CDP REPL

```bash
sentient repl https://news.ycombinator.com
```

Opens an interactive session for manual exploration, action dispatching, and live state inspection.

---

### `sentient mcp` — MCP server (stdio)

```bash
sentient mcp
```

Starts the MCP server over stdio for integration with Claude Desktop, Cursor, Windsurf, etc. Equivalent to running `npx @sentient-browser/mcp`.

---

## 🔗 Related Packages

| Package | Purpose |
|---|---|
| [`@sentient-browser/core`](https://www.npmjs.com/package/@sentient-browser/core) | Runtime engine |
| [`@sentient-browser/sdk`](https://www.npmjs.com/package/@sentient-browser/sdk) | TypeScript/JS WebSocket client |
| [`@sentient-browser/mcp`](https://www.npmjs.com/package/@sentient-browser/mcp) | Standalone MCP server |
| [`@sentient-browser/test`](https://www.npmjs.com/package/@sentient-browser/test) | Playwright & Vitest adapter |

---

## 📜 License

[MIT](../../LICENSE) © Sentient Browser Contributors
