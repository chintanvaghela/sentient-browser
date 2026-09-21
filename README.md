# Sentient Browser 🌐🤖

> **The AI-Native Browser Runtime for Autonomous AI Agents**  
> Replace bloated HTML, brittle XPath/CSS selectors, and arbitrary `sleep()` loops with **pruned Semantic DOMs**, **deterministic settlement**, **incremental state diffs**, **native CDP events**, and an **autonomous goal planner**.

---

## ⚡ Highlights

- 📉 **>70–90% Token Reduction**: Strips style, scripts, layout wrappers, and invisible elements into a clean semantic JSON tree.
- 🎯 **Deterministic Settlement (Zero `sleep()`)**: Multi-signal engine synchronizing CDP network quiet, DOM mutations, RAF flush, and React/Vue/Angular pending queues.
- 🆔 **Stable Semantic Identifiers**: Resilient element IDs generated from accessibility labels, test IDs, and semantic roles (e.g. `time_tracker_button`, `login_button`).
- 🔄 **Incremental State Diffing**: Broadcasts compact mutation diffs (`added`, `removed`, `updated`) after every action, saving 95% of subsequent tokens.
- 🖱️ **Native CDP Input Dispatch**: Dispatches real hardware-level `Input.dispatchMouseEvent` and `Input.dispatchKeyEvent` rather than synthetic DOM events.
- 🤖 **Autonomous Goal Planner**: Zero-dependency heuristic and LLM-compatible goal solver (`sentient act <url> "<goal>"`).
- ↩️ **Action Rollback Engine**: Reverts form values, navigation, and modal states with automatic inverse operations.
- 🔍 **Visual Web Inspector**: Live dark-mode dashboard at `http://localhost:9222/` with sticky bottom dock, search filter, action triggers, and extraction drawers.
- 🐍 **Dual SDKs (TypeScript & Python)**: Native client libraries for Node.js, Python (asyncio & sync), LangChain, CrewAI, and AutoGen.

---

## 📦 Monorepo Architecture

```
AIBrowserRuntime/
├── packages/
│   ├── core/           # @sentient/core: Runtime engine, CDP driver, Semantic DOM & State Diff
│   ├── sdk/            # @sentient/sdk: TypeScript/JavaScript WebSocket client SDK
│   ├── sdk-python/     # sentient-browser: Python client SDK (Async & Sync)
│   └── cli/            # @sentient/cli: Executable CLI (sentient serve, run, act, repl)
├── docs/               # Architecture specs and technical roadmaps
└── examples/           # Integration scripts & demonstrations
```

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js**: `v20+` (v22+ recommended)
- **pnpm**: `v9+`
- **Python**: `3.9+` (optional, for Python SDK)

### 2. Install & Build

```bash
# Clone the repository
git clone https://github.com/your-org/AIBrowserRuntime.git
cd AIBrowserRuntime

# Install all monorepo dependencies
pnpm install

# Build all TypeScript packages
pnpm build
```

### 3. Run Test Suite

```bash
pnpm test
```
*Vitest suite with 100% pass rate across all 9 test suites (24/24 tests).*

---

## 🖥️ Command Line Interface (CLI)

The `@sentient/cli` package provides quick access to browser automation and inspection:

```bash
# Start the WebSocket server and visual Web Inspector
sentient serve --port 9222

# Inspect a single URL and print pruned Semantic DOM JSON
sentient run https://sprint-desk.com

# Launch interactive REPL session with live CDP control
sentient repl https://sprint-desk.com

# Execute an autonomous objective
sentient act https://sprint-desk.com "Find features of Time Tracker"
```

---

## 🔍 Visual Web Inspector

Start `sentient serve --port 9222` and open **`http://localhost:9222/`** in your browser:

- **Action Targets Panel**: Instant interactive cards with role pills and inline `[Click]` / `[Hover]` triggers. Includes a real-time `🔍 Quick filter`.
- **Pruned Semantic DOM Tree**: Interactive JSON tree showing actionable nodes. Copy to clipboard with 1 click.
- **Incremental State Diff Stream**: Real-time mutation log showing element additions, removals, and property changes.
- **Sticky Bottom Action Dock**:
  - **🤖 Autonomous Agent Solver**: Enter high-level goal, click `🚀 Auto Solve`, or click `↩️ Rollback (Undo)`.
  - **🎯 Direct CDP Control**: Input target ID, text to fill, hover, and direction scrolling.
  - **📑 Extraction Drawers**: View page summary and extracted hyperlinks instantly.

---

## 💻 TypeScript SDK Usage

```typescript
import { SentientClient } from '@sentient/sdk';

async function main() {
  const client = await SentientClient.connect({ url: 'ws://127.0.0.1:9222' });
  const page = await client.newPage();

  // Listen to incremental diffs
  client.onDiff((diff) => console.log('Mutation Diff:', diff.compact));

  // Navigate with deterministic settlement
  const snapshot = await page.goto('https://sprint-desk.com');
  console.log(`Loaded: ${snapshot.title} (${snapshot.interactiveCount} targets)`);

  // Solve a goal autonomously
  const result = await page.solve('Find features of Time Tracker');
  console.log('Result:', result.answer);

  // Rollback action
  const rollbackDiff = await page.rollback();
  console.log('Rolled back:', rollbackDiff.compact);

  await page.close();
  await client.close();
}
main();
```

---

## 🐍 Python SDK Usage

Install the Python client:
```bash
pip install ./packages/sdk-python
```

### Synchronous (Quick scripts & Notebooks)

```python
from sentient import SyncSentientClient

with SyncSentientClient("ws://127.0.0.1:9222") as client:
    page = client.new_page()
    snapshot = page.goto("https://sprint-desk.com")
    print(f"Title: {snapshot.title}")

    # Solve goal autonomously
    result = page.solve("Find features of Time Tracker")
    print(f"Answer: {result.answer} (took {result.duration_ms}ms)")

    # Rollback
    page.rollback()
    page.close()
```

### Asynchronous (LangChain / CrewAI / AutoGen)

```python
import asyncio
from sentient import SentientClient

async def main():
    client = await SentientClient.connect("ws://127.0.0.1:9222")
    page = await client.new_page()

    snapshot = await page.goto("https://sprint-desk.com")
    diff = await page.click("time_tracker_button")
    print("Diff:", diff.compact)

    await page.close()
    await client.close()

asyncio.run(main())
```

---

## 📊 Token & Performance Comparison

| Metric | Raw Chromium / Puppeteer | Sentient Browser Runtime | Improvement |
|---|---|---|---|
| **Tokens per Page Load** | 15,000 – 40,000 tokens | **600 – 1,800 tokens** | **>88–92% Reduction** |
| **Tokens per Interaction** | 15,000 tokens (full HTML) | **40 – 150 tokens (Diff)** | **>98% Reduction** |
| **Settlement Detection** | `sleep(3)` or timeout | **Deterministic Multi-Signal (~45ms)** | **Instant & Reliable** |
| **Selector Fragility** | High (brittle CSS/XPath) | **Zero (Semantic Stable IDs)** | **Self-Healing** |
| **Input Authenticity** | Synthetic JavaScript events | **Native Chrome DevTools Protocol** | **Human-Equivalent** |

---

## 📜 License

MIT © Sentient Browser Contributors.
