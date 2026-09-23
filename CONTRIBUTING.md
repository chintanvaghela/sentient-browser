# Contributing to Sentient Browser 🌐🤖

Thank you for your interest in contributing to **Sentient Browser**! We are building an AI-native browser runtime designed for autonomous agents, focusing on extreme token efficiency, deterministic settlement, stable identifiers, and native CDP execution.

---

## 🛠️ Development Setup

### Prerequisites

- **Node.js**: `v20.x` or `v22.x` (enforced via `.nvmrc` and `engines`)
- **pnpm**: `v9.x` (`corepack enable` or `npm install -g pnpm`)
- **Python**: `3.9+` (optional, for `@sentient/sdk-python`)

### Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/chintanvaghela/sentient-browser.git
cd sentient-browser

# 2. Use Node 22+
nvm use || nvm install 22

# 3. Install monorepo dependencies
pnpm install

# 4. Build all packages
pnpm run build

# 5. Run test suite
pnpm test
```

---

## 📦 Monorepo Structure

```
sentient-browser/
├── packages/
│   ├── core/           # @sentient/core: Runtime engine, CDP driver, state diffing & settlement
│   ├── sdk/            # @sentient/sdk: TypeScript WebSocket client SDK & embedded runner
│   ├── sdk-python/     # sentient-browser: Python client SDK (Async & Sync)
│   ├── mcp/            # @sentient/mcp: Official Model Context Protocol (MCP) server
│   ├── cli/            # @sentient/cli: CLI binary (sentient serve, run, act, repl, mcp)
│   └── test/           # @sentient/test: Playwright & Vitest test runner adapter & matchers
├── docs/               # Architecture specs and technical roadmaps
└── examples/           # Integration scripts & demonstrations
```

---

## 🧪 Testing Guidelines

Before opening a pull request, ensure all packages build, typecheck, and pass tests cleanly:

```bash
# Typecheck all packages
pnpm run typecheck

# Build all packages
pnpm run build

# Run Vitest suite across all packages
pnpm test
```

### Adding Site Plugins

To create a plugin for a specific website (e.g. GitHub, Stripe, Amazon):
1. Create a new plugin file in `packages/core/src/plugins/builtin/<site_name>.ts`.
2. Implement the `SitePlugin` interface from `packages/core/src/plugins/types.ts`.
3. Export and register the plugin in `packages/core/src/plugins/registry.ts`.
4. Add unit test coverage in `packages/core/test/plugins.test.ts`.

---

## 🤝 Pull Request Process

1. Create a feature branch (`git checkout -b feat/your-feature-name`).
2. Follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
3. Ensure no local secrets or private URLs are introduced.
4. Open a Pull Request against the `main` branch with a clear summary of your changes.

---

## 📜 License

By contributing to Sentient Browser, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).
