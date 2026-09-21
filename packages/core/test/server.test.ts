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

    ws.close();
  });
});
