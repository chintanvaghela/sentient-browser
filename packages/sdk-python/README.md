# Sentient Browser Python SDK

Python client for **Sentient Browser**, the AI-native browser runtime engineered specifically for autonomous AI agents.

## Features

- ⚡ **>70–90% Token Reduction**: Extract concise Semantic DOM snapshots pruned of non-actionable markup.
- 🎯 **Native CDP Input Dispatch**: Real mouse moves, clicks, and keyboard events dispatched via Chrome DevTools Protocol.
- 🔄 **Incremental State Diffing**: Track mutations between actions rather than re-evaluating full DOMs.
- 🤖 **Autonomous Goal Planner**: Execute natural language objectives (`page.solve("Find pricing details")`).
- ↩️ **Action Rollback Engine**: Revert form values and navigation with inverse operations.
- 🚀 **Async & Sync APIs**: Works seamlessly in both `asyncio` applications and synchronous scripts/notebooks.

---

## Installation

```bash
pip install ./packages/sdk-python
```

Or install in editable mode for development:
```bash
pip install -e packages/sdk-python
```

---

## Quickstart

Ensure the Sentient Browser runtime is running:
```bash
sentient serve --port 9222
```

### 1. Synchronous Example

```python
from sentient import SyncSentientClient

with SyncSentientClient("ws://127.0.0.1:9222") as client:
    page = client.new_page()
    snapshot = page.goto("https://sprint-desk.com")
    print(f"Page Title: {snapshot.title}")
    print(f"Interactive Targets: {snapshot.interactive_count}")

    # Solve a goal autonomously
    result = page.solve("Find features of Time Tracker")
    print(f"Goal Result: {result.answer} (took {result.duration_ms}ms in {result.steps_count} steps)")

    # Rollback last action
    diff = page.rollback()
    print(f"Rollback diff: {diff.compact}")

    page.close()
```

### 2. Asynchronous Example (LangChain / CrewAI / AutoGen)

```python
import asyncio
from sentient import SentientClient

async def main():
    client = await SentientClient.connect("ws://127.0.0.1:9222")
    page = await client.new_page()

    # Listen to real-time DOM diffs
    client.on_diff(lambda diff, page_id: print(f"Diff received: {diff.compact}"))

    # Navigate
    snapshot = await page.goto("https://sprint-desk.com")
    
    # Target element click by stable ID
    diff = await page.click("time_tracker_button")
    print("Diff after click:", diff.compact)

    # Extract structured links
    links = await page.extract_links()
    print(f"Found {len(links)} links")

    await page.close()
    await client.close()

asyncio.run(main())
```

---

## API Reference

### `RemoteSentientPage` / `SyncRemoteSentientPage`

| Method | Returns | Description |
|---|---|---|
| `goto(url, timeout_ms=30000)` | `SemanticSnapshot` | Navigates to URL with deterministic settlement |
| `get_semantic_dom()` | `SemanticSnapshot` | Pruned Semantic DOM tree |
| `get_diff()` | `StateDiff` | Incremental diff from previous state |
| `click(target, button="left")`| `StateDiff` | Native CDP click on stable ID |
| `fill(target, text)` | `StateDiff` | Native CDP typing into target input |
| `hover(target)` | `StateDiff` | Native CDP mouse hover |
| `scroll(direction="down")` | `StateDiff` | Scroll window or container |
| `rollback()` | `StateDiff` | Undo / rollback inverse browser action |
| `solve(goal, max_steps=8)` | `PlannerResult` | Autonomous heuristic or LLM goal planner |
| `get_summary()` | `dict` | Page title, meta tags, headings, top links |
| `extract_links()` | `list[dict]` | Cleaned hyperlinks |
| `extract_table(selector)` | `list[dict]` | Structured table records |
| `extract_list(selector)` | `list[str]` | List items |
| `close()` | `None` | Closes page session |

---

## License

MIT
