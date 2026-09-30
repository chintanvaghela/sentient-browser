# @sentient-browser/mcp

[![npm](https://img.shields.io/npm/v/@sentient-browser/mcp)](https://www.npmjs.com/package/@sentient-browser/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../../LICENSE)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io)

> Official Model Context Protocol (MCP) server for [Sentient Browser](https://github.com/chintanvaghela/sentient-browser) — a **10x faster, >90% token-cheaper** alternative to `chrome-devtools-mcp` for connecting LLM agents to live browsers.

Connect **Claude Desktop**, **Cursor**, **Windsurf**, **Antigravity**, or any MCP-compatible agent directly to a real Chrome browser with compact semantic output, deterministic settlement, and autonomous goal solving.

---

## ⚡ Why Sentient MCP vs `chrome-devtools-mcp`?

| Feature | `chrome-devtools-mcp` | **Sentient Browser MCP** |
|---|---|---|
| **Token Consumption** | Dumps thousands of raw HTML/accessibility lines | **Compact semantic JSON (30–40 actionable nodes)** |
| **Mutation Updates** | Must re-dump the whole DOM (>15k tokens) | **Returns incremental diff (<100 tokens)** |
| **Settlement** | Brittle fixed timeouts | **Deterministic multi-signal quiet detection** |
| **Target Selectors** | Raw XPath/CSS that breaks on DOM change | **Stable semantic IDs from accessibility labels** |
| **Autonomous Action** | Single atomic actions only | **Single actions AND full autonomous planner** |
| **Visual Oversight** | Headless, no live stream | **Real-time 15–20 FPS screencast in Web Inspector** |

---

## 📦 Install & Run

```bash
# Run directly with npx (no install needed)
npx @sentient-browser/mcp

# Or install globally
npm install -g @sentient-browser/mcp
sentient-browser-mcp
```

> **Tip:** If `sentient serve --port 9222` is already running, the MCP server connects to it automatically so you can watch your agent's actions live in the Web Inspector at `http://localhost:9222/`. Otherwise it spins up an embedded headless browser automatically.

---

## 🔧 Client Configuration

### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "sentient-browser": {
      "command": "npx",
      "args": ["@sentient-browser/mcp"]
    }
  }
}
```

### Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "sentient-browser": {
      "command": "npx",
      "args": ["@sentient-browser/mcp"]
    }
  }
}
```

### Antigravity / Windsurf
Same `npx @sentient-browser/mcp` pattern — check your client's MCP config docs.

---

## 🛠️ 10 Core Tools

| Tool | Description |
|---|---|
| `sentient_navigate` | Navigate to URL with deterministic settlement & pruned semantic targets |
| `sentient_act` | Solve a multi-step natural language goal autonomously |
| `sentient_click` | Click element by stable ID, button text, or CSS selector |
| `sentient_fill` | Type text into an input field or textarea |
| `sentient_hover` | Hover mouse over element to trigger tooltips/menus |
| `sentient_scroll` | Scroll page or container up/down |
| `sentient_rollback` | Undo last action (restore form state, navigate back) |
| `sentient_extract` | Extract structured tables, lists, links, or page summary as JSON |
| `sentient_snapshot` | Retrieve full semantic snapshot with stable IDs and coordinates |
| `sentient_screenshot` | Capture high-resolution JPEG viewport screenshot |

---

## 🔗 Related Packages

| Package | Purpose |
|---|---|
| [`@sentient-browser/core`](https://www.npmjs.com/package/@sentient-browser/core) | Runtime engine (server-side) |
| [`@sentient-browser/sdk`](https://www.npmjs.com/package/@sentient-browser/sdk) | TypeScript/JS WebSocket client SDK |
| [`@sentient-browser/cli`](https://www.npmjs.com/package/@sentient-browser/cli) | CLI — `sentient serve`, `act`, `repl` |
| [`@sentient-browser/test`](https://www.npmjs.com/package/@sentient-browser/test) | Playwright & Vitest test adapter |

---

## 📜 License

[MIT](../../LICENSE) © Sentient Browser Contributors
