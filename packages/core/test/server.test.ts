import { describe, it, expect, afterAll } from 'vitest';
import http from 'node:http';
import WebSocket from 'ws';
import { SentientServer } from '../src/server/websocket.js';

describe('SentientServer & Web Inspector', () => {
  let server: SentientServer;
  const testPort = 9333;

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  it('starts HTTP and WebSocket server, serves Web Inspector dashboard', async () => {
    server = new SentientServer({ port: testPort, headless: true });
    await server.start();

    // 1. Test HTTP Inspector endpoint
    const html = await new Promise<string>((resolve, reject) => {
      http.get(`http://127.0.0.1:${testPort}/`, (res) => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/html');

        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });

    expect(html).toContain('Sentient Browser');
    expect(html).toContain('Semantic DOM Tree');
    expect(html).toContain('Incremental State Diff Stream');

    // 2. Test WebSocket RPC connection on same port
    const ws = new WebSocket(`ws://127.0.0.1:${testPort}`);
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
    });

    const response = await new Promise<any>((resolve) => {
      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        resolve(msg);
      });
      ws.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'newPage' }));
    });

    expect(response.id).toBe(1);
    expect(response.result?.pageId).toBeDefined();
    const pageId = response.result.pageId;

    // Helper to send RPC and wait for response
    let reqId = 1;
    const sendRpc = (method: string, params: any) =>
      new Promise<any>((resolve) => {
        reqId++;
        const curId = reqId;
        const handler = (raw: any) => {
          const msg = JSON.parse(raw.toString());
          if (msg.id === curId) {
            ws.off('message', handler);
            resolve(msg);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ jsonrpc: '2.0', id: curId, method, params }));
      });

    // 3. Test agent memory RPC
    const rememberRes = await sendRpc('remember', { pageId, key: 'test_key', value: 'hello_memory' });
    expect(rememberRes.result?.status).toBe('success');

    const recallRes = await sendRpc('recall', { pageId, key: 'test_key' });
    expect(recallRes.result?.value).toBe('hello_memory');

    const clearRes = await sendRpc('clearMemory', { pageId });
    expect(clearRes.result?.status).toBe('success');

    const recallClearedRes = await sendRpc('recall', { pageId, key: 'test_key' });
    expect(recallClearedRes.result?.value).toBeUndefined();

    // 4. Close page
    await sendRpc('closePage', { pageId });

    ws.close();
  });
});
