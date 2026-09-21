import { WebSocketServer, WebSocket } from 'ws';
import { ChromiumManager, SentientPage } from '../browser/chromium.js';

export interface ServerOptions {
  port?: number;
  headless?: boolean;
}

/**
 * WebSocket Server exposing JSON-RPC 2.0 interface for remote AI agents.
 */
export class SentientServer {
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
      this.wss = new WebSocketServer({ port }, () => {
        resolve(port);
      });

      this.wss.on('error', reject);
      this.wss.on('connection', (ws) => this.handleConnection(ws));
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
        return { status: 'success', diff };
      }

      case 'scroll': {
        const page = this.getPage(params.pageId);
        const diff = await page.scroll(params.options || {});
        return { status: 'success', diff };
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
  }
}
