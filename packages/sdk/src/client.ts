import WebSocket from 'ws';
import type { SemanticSnapshot, StateDiff, ClickOptions, FillOptions, ScrollOptions } from '@sentient/core';

export interface ClientOptions {
  url?: string;
  timeoutMs?: number;
}

/**
 * Remote page interface connected over WebSocket.
 */
export class RemoteSentientPage {
  constructor(
    private pageId: string,
    private client: SentientClient
  ) {}

  getId(): string {
    return this.pageId;
  }

  async goto(url: string, options: { timeoutMs?: number } = {}): Promise<SemanticSnapshot> {
    return this.client.call('goto', { pageId: this.pageId, url, timeoutMs: options.timeoutMs });
  }

  async getSemanticDOM(): Promise<SemanticSnapshot> {
    return this.client.call('getSemanticDOM', { pageId: this.pageId });
  }

  async getDiff(): Promise<StateDiff> {
    return this.client.call('getDiff', { pageId: this.pageId });
  }

  async click(target: string, options?: ClickOptions): Promise<StateDiff> {
    const res = await this.client.call('click', { pageId: this.pageId, target, options });
    return res.diff;
  }

  async fill(target: string, text: string, options?: FillOptions): Promise<StateDiff> {
    const res = await this.client.call('fill', { pageId: this.pageId, target, text, options });
    return res.diff;
  }

  async hover(target: string): Promise<StateDiff> {
    const res = await this.client.call('hover', { pageId: this.pageId, target });
    return res.diff;
  }

  async scroll(options: ScrollOptions = {}): Promise<StateDiff> {
    const res = await this.client.call('scroll', { pageId: this.pageId, options });
    return res.diff;
  }

  async getSummary(): Promise<any> {
    return this.client.call('getSummary', { pageId: this.pageId });
  }

  async extractTable(selector?: string): Promise<Record<string, string>[]> {
    return this.client.call('extractTable', { pageId: this.pageId, selector });
  }

  async extractList(selector?: string): Promise<string[]> {
    return this.client.call('extractList', { pageId: this.pageId, selector });
  }

  async extractLinks(): Promise<Array<{ text: string; href: string }>> {
    return this.client.call('extractLinks', { pageId: this.pageId });
  }

  async rollback(): Promise<StateDiff> {
    const res = await this.client.call('rollback', { pageId: this.pageId });
    return res.diff;
  }

  async solve(goal: any): Promise<any> {
    return this.client.call('solve', { pageId: this.pageId, goal });
  }

  async screenshot(options?: { format?: 'jpeg' | 'png'; quality?: number }): Promise<string> {
    const res = await this.client.call('screenshot', { pageId: this.pageId, options });
    return res.data;
  }

  async close(): Promise<void> {
    await this.client.call('closePage', { pageId: this.pageId });
  }
}

/**
 * WebSocket client for AI Agents to interact with Sentient Browser.
 */
export class SentientClient {
  private ws: WebSocket | null = null;
  private reqCounter = 0;
  private pendingRequests: Map<number, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();
  private diffListeners: Array<(diff: StateDiff, pageId: string) => void> = [];

  constructor(private options: ClientOptions = {}) {}

  static async connect(options: ClientOptions = {}): Promise<SentientClient> {
    const client = new SentientClient(options);
    await client.init();
    return client;
  }

  private async init(): Promise<void> {
    const url = this.options.url || 'ws://127.0.0.1:9222';

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => resolve());
      this.ws.on('error', (err) => reject(err));

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());

          // Handle server-sent events
          if (msg.method === 'event.domDiff') {
            const { pageId, diff } = msg.params;
            for (const listener of this.diffListeners) {
              listener(diff, pageId);
            }
            return;
          }

          // Handle RPC responses
          if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
            const { resolve, reject } = this.pendingRequests.get(msg.id)!;
            this.pendingRequests.delete(msg.id);

            if (msg.error) {
              reject(new Error(msg.error.message || 'RPC error'));
            } else {
              resolve(msg.result);
            }
          }
        } catch (_) {}
      });
    });
  }

  async call(method: string, params: any = {}): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    this.reqCounter++;
    const id = this.reqCounter;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
    });
  }

  async newPage(): Promise<RemoteSentientPage> {
    const { pageId } = await this.call('newPage');
    return new RemoteSentientPage(pageId, this);
  }

  onDiff(listener: (diff: StateDiff, pageId: string) => void): void {
    this.diffListeners.push(listener);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  async close(): Promise<void> {
    this.disconnect();
  }
}
