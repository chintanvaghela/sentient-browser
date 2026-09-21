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
- [ ] Initialize pnpm monorepo (`@sentient/core`, `@sentient/sdk`, `@sentient/cli`).
- [ ] Implement `ChromiumManager` using Playwright-core & direct CDP session attachment.
- [ ] Support `chromium_headless_shell` (low-resource mode) and standard headful mode for debugging.
- [ ] Ephemeral profile directory isolation and cleanup.

#### Milestone 1.2: Injected Context & Semantic DOM Extractor
- [ ] Implement isolated script injection via `Page.addScriptToEvaluateOnNewDocument`.
- [ ] Implement DOM pruning heuristics (discard script, style, layout-only divs/spans, zero-sized elements).
- [ ] Implement `SemanticNode` schema serialization (role, text, tag, visible, clickable, enabled, bbox).
- [ ] Verify **>70% token reduction** compared to raw HTML across test fixtures.

#### Milestone 1.3: Deterministic Stable ID Generator
- [ ] Implement slugification algorithm based on semantic role, accessible text, and parent container context.
- [ ] Implement disambiguation counters for repeated items (e.g. `product_card_1_add_to_cart_btn`).
- [ ] Add unit test verifying ID stability across dynamic re-renders and framework hydration.

#### Milestone 1.4: Smart Wait Engine
- [ ] Intercept `fetch` and `XMLHttpRequest` in injected script to track active in-flight requests.
- [ ] Attach `MutationObserver` to monitor DOM mutations with configurable quiet debounce (100ms).
- [ ] Query Web Animations API (`document.getAnimations()`) and double-RAF frame flushing.
- [ ] Implement diagnostic error reporting on timeout with list of blocking requests/mutations.

#### Milestone 1.5: Intent Action Engine
- [ ] Target resolution pipeline: Stable ID -> Normalized Text -> Fuzzy Match.
- [ ] Pre-flight checks: scroll-into-view, visibility, and element occlusion detection.
- [ ] Dispatch native CDP input events (`Input.dispatchMouseEvent`, `Input.dispatchKeyEvent`).
- [ ] Implement core action methods: `click()`, `fill()`, `type()`, `hover()`, `select()`, `scroll()`.
- [ ] Automatic post-action wait settlement integration.

#### Milestone 1.6: State Diff Engine & WebSocket Server
- [ ] Implement snapshot memory and delta calculation (`NODE_ADDED`, `NODE_REMOVED`, `NODE_UPDATED`).
- [ ] Generate compact LLM string representation (`toCompactString()`).
- [ ] Implement WebSocket JSON-RPC 2.0 gateway on configurable port (default: `9222`).
- [ ] Publish real-time events (`dom:diff`, `page:navigated`, `page:modal`).

#### Milestone 1.7: Agent SDK & CLI Runner
- [ ] Build `@sentient/sdk` TypeScript client with simple async/await API.
- [ ] Build `@sentient/cli` with `sentient-browser run <url>` and interactive REPL mode.
- [ ] E2E test suite running real-world login and form-filling scenarios.

### Phase 1 Acceptance Criteria
1. **Token Reduction**: Semantic DOM uses at least **70% fewer tokens** than raw HTML.
2. **Selector Reliability**: Intent actions succeed using Stable IDs without relying on CSS classnames.
3. **Zero Sleep**: No tests require arbitrary `sleep()` or timeout hacks.
4. **End-to-End Flow**: An agent script can open a page, fill inputs, click a button, receive a state diff delta, and assert success in < 3 seconds.

---

## Phase 2: Memory Layer & Parallel Tabs

**Goal**: Enable long-running agent persistence, multi-tab parallel scraping/research, and semantic caching.

### Milestones & Deliverables
- [ ] **Session Memory Layer**: Persistent SQLite store for visited pages, form values, session tokens, and extracted entities.
- [ ] **Semantic Cache**: Cache semantic structures for recurring pages to bypass redundant parsing.
- [ ] **Parallel Tab Scheduler**: Coordinate 5–15 concurrent tabs with isolated memory, returning unified summaries to the agent.
- [ ] **Action History & Rollback**: Track reverse actions (e.g. undoing a form fill or navigating back) when an action encounters an error.

---

## Phase 3: Site Plugins & Vision Fusion

**Goal**: Simplify complex multi-step workflows for popular web apps and bridge visual gaps.

### Milestones & Deliverables
- [ ] **Site Plugin Architecture**: Extensible plugin system for pre-packaged high-level workflows (e.g., `browser.amazon.search()`, `browser.stripe.pay()`, `browser.github.createPr()`).
- [ ] **Semantic Vision Fusion**: Merge OCR and bounding-box visual embeddings for non-DOM elements (`<canvas>`, WebGL, interactive charts, CAPTCHA detection).
- [ ] **Autonomous Goal Planner**: High-level planner that breaks a natural language goal ("Find cheapest flight from JFK to LHR on Friday") into a directed acyclic task graph.

---

## Phase 4: Cloud Cluster & Enterprise Scale

**Goal**: Scale to 100+ parallel instances with enterprise-grade sandboxing and security.

### Milestones & Deliverables
- [ ] **Distributed Browser Cluster**: Dockerized worker pools orchestrated via Redis/gRPC.
- [ ] **Security Sandbox & Vault**: Credential encryption, domain access allowlisting, sensitive input masking.
- [ ] **Full Audit Logging & Session Replay**: High-speed action logging with frame-by-frame visual recording for compliance.
- [ ] **Plugin Marketplace**: Community repository for site plugins and semantic patterns.
