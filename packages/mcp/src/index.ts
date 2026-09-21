#!/usr/bin/env node
import { SentientMcpServer, type McpServerOptions } from './server.js';

export * from './server.js';
export * from './tools.js';

export async function runMcpServer(options: McpServerOptions = {}): Promise<SentientMcpServer> {
  const server = new SentientMcpServer(options);
  server.startStdio();

  const cleanup = async () => {
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  return server;
}

// Auto-run if executed directly as a script / binary
const isDirectRun = Boolean(
  process.argv[1] &&
  (process.argv[1].endsWith('/sentient-mcp') ||
   process.argv[1].endsWith('/index.js') ||
   process.argv[1].endsWith('/index.mjs') ||
   process.argv[1].includes('packages/mcp'))
);

if (isDirectRun) {
  runMcpServer().catch((err) => {
    process.stderr.write(`Fatal MCP Server error: ${err?.message || err}\n`);
    process.exit(1);
  });
}
