import readline from 'node:readline';
import { ChromiumManager, type SentientPage, type SemanticSnapshot } from '@sentient/core';
import { SentientClient, type RemoteSentientPage } from '@sentient/sdk';
import { SENTIENT_TOOLS } from './tools.js';

export interface McpServerOptions {
  daemonUrl?: string;
  headless?: boolean;
}

/**
 * Model Context Protocol (MCP) Server for Sentient Browser.
 * Operates over standard I/O (stdio) for instant integration with Claude Desktop, Cursor, and Antigravity.
 */
export class SentientMcpServer {
  private browserManager: ChromiumManager | null = null;
  private sentientClient: SentientClient | null = null;
  private activePage: SentientPage | RemoteSentientPage | null = null;
  private isConnectedToDaemon = false;

  constructor(private options: McpServerOptions = {}) {}

  /**
   * Initializes page connection (attaches to daemon or launches embedded Chromium).
   */
  async ensurePage(): Promise<SentientPage | RemoteSentientPage> {
    if (this.activePage) return this.activePage;

    const daemonUrl = this.options.daemonUrl || 'ws://127.0.0.1:9222';

    // 1. Attempt connection to running daemon
    try {
      this.sentientClient = await SentientClient.connect({ url: daemonUrl, timeoutMs: 1500 });
      this.activePage = await this.sentientClient.newPage();
      this.isConnectedToDaemon = true;
      return this.activePage;
    } catch (_) {
      this.isConnectedToDaemon = false;
    }

    // 2. Fallback to embedded headless browser
    this.browserManager = new ChromiumManager();
    await this.browserManager.launch({ headless: this.options.headless !== false });
    this.activePage = await this.browserManager.newPage();
    return this.activePage;
  }

  /**
   * Dispatches an MCP tool call to the browser runtime.
   */
  async executeTool(name: string, args: Record<string, any>): Promise<any> {
    const page = await this.ensurePage();

    switch (name) {
      case 'sentient_navigate': {
        const snapshot: SemanticSnapshot = await page.goto(args.url, { timeoutMs: args.timeoutMs });
        const interactives = (snapshot.nodes || [])
          .filter((n) => n.clickable || n.role === 'button' || n.role === 'textbox' || n.role === 'link')
          .slice(0, 35)
          .map((n) => `• [${n.id}] (${n.role}): "${n.text || n.placeholder || ''}"`)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Page Loaded: "${snapshot.title}" (${snapshot.url})\nInteractive Targets (${snapshot.interactiveCount}):\n${interactives || '(no interactive elements)'}`
            }
          ]
        };
      }

      case 'sentient_act': {
        if (args.url) {
          await page.goto(args.url);
        }
        const result = await page.solve({
          goal: args.goal,
          maxSteps: args.maxSteps || 8
        });

        const stepsSummary = (result.steps || [])
          .map((s: any) => `[Step ${s.stepNumber}] ${s.action.type.toUpperCase()} ${s.action.target ? '-> ' + s.action.target : ''} | Diff: ${s.diffSummary || 'settled'}`)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Autonomous Goal: "${result.goal}"\nStatus: ${result.success ? '✓ SUCCESS' : '⚠️ FAILED'}\nAnswer: ${result.answer || (result.error ? 'Error: ' + result.error : 'Goal completed')}\nDuration: ${result.durationMs}ms (${result.stepsCount} steps)\n\nExecution Trajectory:\n${stepsSummary}`
            }
          ]
        };
      }

      case 'sentient_click': {
        const diff = await page.click(args.target);
        return {
          content: [
            {
              type: 'text',
              text: diff.compact ? `Click dispatched on "${args.target}".\nState Diff:\n${diff.compact}` : `Click dispatched on "${args.target}". Page settled with 0 mutations.`
            }
          ]
        };
      }

      case 'sentient_fill': {
        const diff = await page.fill(args.target, args.text);
        return {
          content: [
            {
              type: 'text',
              text: diff.compact ? `Typed "${args.text}" into "${args.target}".\nState Diff:\n${diff.compact}` : `Typed "${args.text}" into "${args.target}".`
            }
          ]
        };
      }

      case 'sentient_hover': {
        const diff = await page.hover(args.target);
        return {
          content: [
            {
              type: 'text',
              text: diff.compact ? `Hovered "${args.target}".\nState Diff:\n${diff.compact}` : `Hovered "${args.target}".`
            }
          ]
        };
      }

      case 'sentient_scroll': {
        const diff = await page.scroll({ direction: args.direction || 'down', amountPx: args.amountPx || 600 });
        return {
          content: [
            {
              type: 'text',
              text: diff.compact ? `Scrolled ${args.direction || 'down'}.\nState Diff:\n${diff.compact}` : `Scrolled ${args.direction || 'down'}.`
            }
          ]
        };
      }

      case 'sentient_rollback': {
        const diff = await page.rollback();
        return {
          content: [
            {
              type: 'text',
              text: diff.compact ? `Action rolled back.\nState Diff:\n${diff.compact}` : `Rollback executed (state restored).`
            }
          ]
        };
      }

      case 'sentient_extract': {
        const type = args.type;
        if (type === 'summary') {
          const summary = await page.getSummary();
          return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
        } else if (type === 'links') {
          const links = await page.extractLinks();
          return { content: [{ type: 'text', text: JSON.stringify(links, null, 2) }] };
        } else if (type === 'table') {
          const table = await page.extractTable(args.selector);
          return { content: [{ type: 'text', text: JSON.stringify(table, null, 2) }] };
        } else if (type === 'list') {
          const list = await page.extractList(args.selector);
          return { content: [{ type: 'text', text: JSON.stringify(list, null, 2) }] };
        }
        throw new Error(`Unknown extraction type: ${type}`);
      }

      case 'sentient_snapshot': {
        const snapshot = await page.getSemanticDOM();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(snapshot, null, 2)
            }
          ]
        };
      }

      case 'sentient_screenshot': {
        const base64 = await page.screenshot({ format: 'jpeg', quality: 80 });
        return {
          content: [
            {
              type: 'image',
              data: base64,
              mimeType: 'image/jpeg'
            },
            {
              type: 'text',
              text: `Screenshot captured (JPEG, quality 80, length: ${base64.length} chars)`
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Starts the stdio JSON-RPC loop.
   */
  startStdio(): void {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let req: any;
      try {
        req = JSON.parse(trimmed);
      } catch (_) {
        this.send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
        return;
      }

      const { id, method, params } = req;

      // Notifications (no id)
      if (id === undefined || id === null) {
        if (method === 'notifications/initialized') {
          // Client acknowledged initialization
        }
        return;
      }

      try {
        if (method === 'initialize') {
          this.send({
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {
                  listChanged: false
                }
              },
              serverInfo: {
                name: 'sentient-browser-mcp',
                version: '0.1.0'
              }
            }
          });
          return;
        }

        if (method === 'tools/list') {
          this.send({
            jsonrpc: '2.0',
            id,
            result: {
              tools: SENTIENT_TOOLS
            }
          });
          return;
        }

        if (method === 'tools/call') {
          const toolName = params?.name;
          const toolArgs = params?.arguments || {};
          const toolResult = await this.executeTool(toolName, toolArgs);
          this.send({
            jsonrpc: '2.0',
            id,
            result: toolResult
          });
          return;
        }

        this.send({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` }
        });
      } catch (err: any) {
        this.send({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: `Error executing tool: ${err.message || 'Unknown error'}`
              }
            ],
            isError: true
          }
        });
      }
    });
  }

  private send(msg: any): void {
    process.stdout.write(JSON.stringify(msg) + '\n');
  }

  async close(): Promise<void> {
    if (this.activePage) {
      await this.activePage.close().catch(() => {});
      this.activePage = null;
    }
    if (this.browserManager) {
      await this.browserManager.close().catch(() => {});
      this.browserManager = null;
    }
    if (this.sentientClient) {
      await this.sentientClient.close().catch(() => {});
      this.sentientClient = null;
    }
  }
}
