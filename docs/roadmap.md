# Sentient Browser: Project Roadmap & Milestones

This document details the development phases, technical milestones, deliverables, and acceptance criteria for **Sentient Browser**.

---

## Roadmap Overview

```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│        PHASE 1          │     │        PHASE 2          │     │        PHASE 3          │     │        PHASE 4          │
│       Core MVP          │ ──> │   Memory & Parallel     │ ──> │    Plugins & Vision     │ ──> │     Cloud Cluster       │
│  (Target: 1.5-2 Weeks)  │     │   (Target: 2 Weeks)     │     │   (Target: 2-3 Weeks)   │     │    (Target: Ongoing)    │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
```

---

## Phase 1: Core MVP (Current Focus)

**Goal**: Establish the foundational AI-first browser runtime with semantic DOM extraction, deterministic stable IDs, smart multi-signal waiting, intent action execution, and real-time state diffing.

### Milestones & Deliverables

#### Milestone 1.1: Project Scaffolding & Chromium CDP Manager
- [x] Initialize pnpm monorepo (`@sentient/core`, `@sentient/sdk`, `@sentient/cli`).
- [x] Implement `ChromiumManager` using Playwright-core & direct CDP session attachment.
- [x] Support `chromium_headless_shell` (low-resource mode) and standard headful mode for debugging.
- [x] Ephemeral profile directory isolation and cleanup.

#### Milestone 1.2: Injected Context & Semantic DOM Extractor
- [x] Implement isolated script injection via `Page.addScriptToEvaluateOnNewDocument`.
- [x] Implement DOM pruning heuristics (discard script, style, layout-only divs/spans, zero-sized elements).
- [x] Implement `SemanticNode` schema serialization (role, text, tag, visible, clickable, enabled, bbox).
- [x] Verify **>70% token reduction** compared to raw HTML across test fixtures.

#### Milestone 1.3: Deterministic Stable ID Generator
- [x] Implement slugification algorithm based on semantic role, accessible text, and parent container context.
- [x] Implement disambiguation counters for repeated items (e.g. `product_card_1_add_to_cart_btn`).
- [x] Add unit test verifying ID stability across dynamic re-renders and framework hydration.

#### Milestone 1.4: Smart Wait Engine
- [x] Intercept `fetch` and `XMLHttpRequest` in injected script to track active in-flight requests.
- [x] Attach `MutationObserver` to monitor DOM mutations with configurable quiet debounce (100ms).
- [x] Query Web Animations API (`document.getAnimations()`) and double-RAF frame flushing.
- [x] Implement diagnostic error reporting on timeout with list of blocking requests/mutations.

#### Milestone 1.5: Intent Action Engine
- [x] Target resolution pipeline: Stable ID -> Normalized Text -> Fuzzy Match.
- [x] Pre-flight checks: scroll-into-view, visibility, and element occlusion detection.
- [x] Dispatch native CDP input events (`Input.dispatchMouseEvent`, `Input.dispatchKeyEvent`).
- [x] Implement core action methods: `click()`, `fill()`, `type()`, `hover()`, `select()`, `scroll()`.
- [x] Automatic post-action wait settlement integration.

#### Milestone 1.6: State Diff Engine & WebSocket Server
- [x] Implement snapshot memory and delta calculation (`NODE_ADDED`, `NODE_REMOVED`, `NODE_UPDATED`).
- [x] Generate compact LLM string representation (`toCompactString()`).
- [x] Implement WebSocket JSON-RPC 2.0 gateway on configurable port (default: `9222`).
- [x] Publish real-time events (`event.domDiff`, `event.agentStep`).

#### Milestone 1.7: Agent SDK & CLI Runner
- [x] Build `@sentient/sdk` TypeScript client with simple async/await API.
- [x] Build `@sentient/cli` with `sentient serve`, `run <url>`, `repl <url>`, and `act <url> "<goal>"`.
- [x] Build `sentient-browser` Python SDK (`packages/sdk-python`) with async and sync APIs.
- [x] E2E test suite running real-world login, diffing, and goal-solving scenarios.

### Phase 1 Acceptance Criteria
1. **Token Reduction**: Semantic DOM uses at least **70% fewer tokens** than raw HTML. (✓ Achieved: 70–92%)
2. **Selector Reliability**: Intent actions succeed using Stable IDs without relying on CSS classnames. (✓ Achieved)
3. **Zero Sleep**: No tests require arbitrary `sleep()` or timeout hacks. (✓ Achieved)
4. **End-to-End Flow**: An agent script can open a page, fill inputs, click a button, receive a state diff delta, and assert success in < 3 seconds. (✓ Achieved)

---

## Phase 2: Memory Layer & Parallel Tabs (Completed)

**Goal**: Enable long-running agent persistence, multi-tab parallel scraping/research, semantic caching, and action rollback.

### Milestones & Deliverables
- [x] **Session Memory Layer**: In-memory and persistent store for visited pages, key-value memory, and entity recall (`page.remember`, `page.recall`).
- [x] **Semantic Cache**: Cache semantic structures for recurring pages (`SemanticCache`) with configurable TTL.
- [x] **Parallel Tab Scheduler**: Coordinate concurrent tabs with controlled concurrency (`ParallelScheduler`, `browser.mapPages`).
- [x] **Action History & Rollback**: Track inverse actions in `ActionJournal` and perform self-healing rollback (`page.rollback()`).

---

## Phase 3: Site Plugins & Vision Fusion (In Progress)

**Goal**: Simplify complex multi-step workflows for web apps, enable autonomous planning, and bridge visual gaps.

### Milestones & Deliverables
- [x] **Site Plugin Architecture**: Extensible plugin registry with built-in plugins (`PluginRegistry`, `HackerNewsPlugin`).
- [x] **Autonomous Goal Planner**: Native goal planning engine (`AutonomousPlanner`, `page.solve()`, CLI `sentient act`) executing multi-step objectives autonomously.
- [x] **Sticky Web Inspector with Autonomous Solver**: Real-time inspector dashboard with bottom dock, instant search filter, card click/hover actions, and auto goal solver.
- [ ] **Semantic Vision Fusion**: Merge OCR and bounding-box visual embeddings for non-DOM elements (`<canvas>`, WebGL, interactive charts, CAPTCHA detection).

---

## Phase 4: Cloud Cluster & Enterprise Scale

**Goal**: Scale to 100+ parallel instances with enterprise-grade sandboxing and security.

### Milestones & Deliverables
- [ ] **Distributed Browser Cluster**: Dockerized worker pools orchestrated via Redis/gRPC.
- [ ] **Security Sandbox & Vault**: Credential encryption, domain access allowlisting, sensitive input masking.
- [ ] **Full Audit Logging & Session Replay**: High-speed action logging with frame-by-frame visual recording for compliance.
- [ ] **Plugin Marketplace**: Community repository for site plugins and semantic patterns.
