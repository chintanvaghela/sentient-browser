# Sentient Browser Documentation

Sentient Browser is an AI-native browser runtime designed specifically for autonomous AI agents, exposing structured **semantic state** and **intent-driven actions** instead of raw HTML, CSS, pixels, and brittle selectors.

---

## Documentation Structure

```
docs/
├── README.md                      # This file (Documentation Index & Overview)
├── architecture.md               # System Architecture, Components & Data Flows
├── roadmap.md                    # Phase-by-phase Milestones & Acceptance Criteria
├── srd.md                        # Software Requirements Document (MVP Vision)
└── specs/
    ├── semantic_dom_spec.md       # Semantic DOM schema, filtering rules & Stable IDs
    ├── intent_api_spec.md         # Intent API methods, target resolution & pre-flight checks
    ├── wait_engine_spec.md        # Smart Wait Engine multi-signal settlement algorithm
    └── state_diff_spec.md         # Incremental state diffing & WebSocket event stream protocol
```

---

## Quick Navigation

| Document | Purpose |
| :--- | :--- |
| **[Architecture Overview](./architecture.md)** | Detailed high-level design, sub-systems, component boundaries, and end-to-end execution flow. |
| **[Semantic DOM & Stable IDs Spec](./specs/semantic_dom_spec.md)** | Schema definition, DOM pruning rules, token-reduction strategies, and deterministic ID generation algorithm. |
| **[Intent API Spec](./specs/intent_api_spec.md)** | Complete specification for agent action methods (`click`, `fill`, `hover`, `scroll`, etc.), pre-flight safety checks, and CDP dispatch. |
| **[Smart Wait Engine Spec](./specs/wait_engine_spec.md)** | Multi-signal readiness detection (Network quiet, MutationObserver debounce, Animations, RAF flush, and Framework detection). |
| **[State Diff & Event Stream Spec](./specs/state_diff_spec.md)** | Incremental state diffing schema, LLM-compact delta format (70–95% token reduction), and WebSocket PubSub API. |
| **[Project Roadmap & Milestones](./roadmap.md)** | Phased delivery plan from Phase 1 (MVP) to Phase 4 (Distributed Cloud Cluster), with concrete acceptance criteria. |

---

## Core Guiding Principles

1. **AI is the Primary User**: We optimize for LLM reasoning speed, context window limits, and deterministic execution rather than human visual layout.
2. **Expose Concepts, Not Pixels or Code**: An agent should never parse `<div>` soup or guess `.css-1dbjc4n` classes. It interacts with semantic nodes like `{ "id": "checkout_button", "role": "button", "text": "Checkout" }`.
3. **Deterministic Readiness**: No arbitrary `sleep(3)`. The runtime guarantees that pages and actions are settled before returning control to the agent.
4. **Token Minimalism**: Every byte emitted to the agent context costs time and money. Full state is sent only when requested; all routine changes stream as compact incremental deltas.
