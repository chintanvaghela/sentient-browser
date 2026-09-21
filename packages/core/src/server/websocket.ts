import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { ChromiumManager, SentientPage } from '../browser/chromium.js';
import { INSPECTOR_HTML } from './inspector_html.js';

export interface ServerOptions {
  port?: number;
  headless?: boolean;
}

/**
 * WebSocket & HTTP Server exposing:
 * 1. JSON-RPC 2.0 interface and PubSub event stream over WebSocket
 * 2. Real-time visual Web Inspector at GET http://localhost:<port>/
 */
export class SentientServer {
  private httpServer: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private browserManager: ChromiumManager;
  private pages: Map<string, SentientPage> = new Map();
  private pageCounter = 0;

  constructor(private options: ServerOptions = {}) {
    this.browserManager = new ChromiumManager();
  }

  async start(): Promise<number> {
    const port = this.options.port || 9222;

    await this.browserManager.launch({
      headless: this.options.headless !== false
    });

    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer((req, res) => {
        if (req.url === '/' || req.url?.startsWith('/inspect')) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(INSPECTOR_HTML);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found. Open / to access Sentient Web Inspector.');
        }
      });

      this.wss = new WebSocketServer({ server: this.httpServer });
      this.wss.on('connection', (ws) => this.handleConnection(ws));

      this.httpServer.on('error', reject);
      this.httpServer.listen(port, () => {
        resolve(port);
      });
    });
  }

  private handleConnection(ws: WebSocket) {
    ws.on('message', async (raw) => {
      let req: any;
      try {
        req = JSON.parse(raw.toString());
      } catch (err) {
        ws.send(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null }));
        return;
      }

      const { id, method, params } = req;

      try {
        const result = await this.executeMethod(method, params || {}, ws);
        ws.send(JSON.stringify({ jsonrpc: '2.0', id, result }));
      } catch (err: any) {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id,
          error: { code: -32603, message: err.message || 'Internal error' }
        }));
      }
    });
  }

  private async executeMethod(method: string, params: any, ws: WebSocket): Promise<any> {
    switch (method) {
      case 'newPage': {
        const page = await this.browserManager.newPage();
        this.pageCounter++;
        const pageId = `page_${this.pageCounter}`;
        this.pages.set(pageId, page);
        return { pageId };
      }

      case 'goto': {
        const page = this.getPage(params.pageId);
        const snapshot = await page.goto(params.url, { timeoutMs: params.timeoutMs });
        return snapshot;
      }

      case 'getSemanticDOM': {
        const page = this.getPage(params.pageId);
        return await page.getSemanticDOM();
      }

      case 'getDiff': {
        const page = this.getPage(params.pageId);
        return await page.getDiff();
      }

      case 'click': {
        const page = this.getPage(params.pageId);
        const diff = await page.click(params.target, params.options);
        // Broadcast diff event to client
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          method: 'event.domDiff',
          params: { pageId: params.pageId, diff }
        }));
        return { status: 'success', diff };
      }

      case 'fill': {
        const page = this.getPage(params.pageId);
        const diff = await page.fill(params.target, params.text, params.options);
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          method: 'event.domDiff',
          params: { pageId: params.pageId, diff }
        }));
        return { status: 'success', diff };
      }

      case 'hover': {
        const page = this.getPage(params.pageId);
        const diff = await page.hover(params.target);
        if (diff && diff.operationsCount > 0) {
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            method: 'event.domDiff',
            params: { pageId: params.pageId, diff }
          }));
        }
        return { status: 'success', diff };
      }

      case 'scroll': {
        const page = this.getPage(params.pageId);
        const diff = await page.scroll(params.options || {});
        if (diff && diff.operationsCount > 0) {
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            method: 'event.domDiff',
            params: { pageId: params.pageId, diff }
          }));
        }
        return { status: 'success', diff };
      }

      case 'getSummary': {
        const page = this.getPage(params.pageId);
        return await page.getSummary();
      }

      case 'extractTable': {
        const page = this.getPage(params.pageId);
        return await page.extractTable(params.selector);
      }

      case 'extractList': {
        const page = this.getPage(params.pageId);
        return await page.extractList(params.selector);
      }

      case 'extractLinks': {
        const page = this.getPage(params.pageId);
        return await page.extractLinks();
      }

      case 'rollback': {
        const page = this.getPage(params.pageId);
        const diff = await page.rollback();
        if (diff && diff.operationsCount > 0) {
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            method: 'event.domDiff',
            params: { pageId: params.pageId, diff }
          }));
        }
        return { status: 'success', diff };
      }

      case 'solve': {
        const page = this.getPage(params.pageId);
        const goalInput = typeof params.goal === 'string' ? { goal: params.goal } : (params.goal || {});
        const goal = {
          ...goalInput,
          onStep: (step: any) => {
            goalInput.onStep?.(step);
            try {
              ws.send(JSON.stringify({
                jsonrpc: '2.0',
                method: 'event.agentStep',
                params: { pageId: params.pageId, step }
              }));
            } catch (_) {}
          }
        };
        return await page.solve(goal);
      }

      case 'startScreencast': {
        const page = this.getPage(params.pageId);
        await page.startScreencast((data, metadata) => {
          try {
            ws.send(JSON.stringify({
              jsonrpc: '2.0',
              method: 'event.screencastFrame',
              params: { pageId: params.pageId, data, metadata }
            }));
          } catch (_) {}
        });
        return { status: 'success' };
      }

      case 'stopScreencast': {
        const page = this.getPage(params.pageId);
        await page.stopScreencast();
        return { status: 'success' };
      }

      case 'screenshot': {
        const page = this.getPage(params.pageId);
        const data = await page.screenshot(params.options);
        return { data };
      }

      case 'closePage': {
        const page = this.getPage(params.pageId);
        await page.close();
        this.pages.delete(params.pageId);
        return { status: 'success' };
      }

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  private getPage(pageId?: string): SentientPage {
    if (!pageId || !this.pages.has(pageId)) {
      throw new Error(`Page not found: ${pageId}`);
    }
    return this.pages.get(pageId)!;
  }

  async stop(): Promise<void> {
    for (const page of this.pages.values()) {
      await page.close().catch(() => {});
    }
    this.pages.clear();
    await this.browserManager.close();

    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => resolve());
      });
      this.wss = null;
    }

    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => resolve());
      });
      this.httpServer = null;
    }
  }
}
