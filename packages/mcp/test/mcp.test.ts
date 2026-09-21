import { describe, it, expect, afterAll } from 'vitest';
import { SentientMcpServer } from '../src/server.js';
import { SENTIENT_TOOLS } from '../src/tools.js';

describe('Sentient MCP Server', () => {
  let server: SentientMcpServer;

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  it('exposes all 10 core autonomous browser tools with standard schemas', () => {
    expect(SENTIENT_TOOLS).toHaveLength(10);

    const toolNames = SENTIENT_TOOLS.map((t) => t.name);
    expect(toolNames).toContain('sentient_navigate');
    expect(toolNames).toContain('sentient_act');
    expect(toolNames).toContain('sentient_click');
    expect(toolNames).toContain('sentient_fill');
    expect(toolNames).toContain('sentient_hover');
    expect(toolNames).toContain('sentient_scroll');
    expect(toolNames).toContain('sentient_rollback');
    expect(toolNames).toContain('sentient_extract');
    expect(toolNames).toContain('sentient_snapshot');
    expect(toolNames).toContain('sentient_screenshot');

    for (const tool of SENTIENT_TOOLS) {
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('executes browser navigation, interaction, and extraction via MCP tool dispatch', async () => {
    // Instantiate with dummy daemonUrl so it cleanly falls back to embedded headless Chromium
    server = new SentientMcpServer({
      daemonUrl: 'ws://127.0.0.1:59999',
      headless: true
    });

    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>MCP Test Page</title></head>
        <body>
          <h1>Sentient MCP Test</h1>
          <a href="https://example.com/item1">First Link</a>
          <input id="test-input" placeholder="Type here..." />
          <button id="counter-btn" onclick="this.innerText = 'Clicked!'">Click Me</button>
        </body>
      </html>
    `;
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(testHtml)}`;

    // 1. sentient_navigate
    const navResult = await server.executeTool('sentient_navigate', { url: dataUrl });
    expect(navResult.content).toBeDefined();
    expect(navResult.content[0].type).toBe('text');
    expect(navResult.content[0].text).toContain('Page Loaded');
    expect(navResult.content[0].text).toContain('MCP Test Page');
    expect(navResult.content[0].text).toContain('Click Me');

    // 2. sentient_click
    const clickResult = await server.executeTool('sentient_click', { target: 'Click Me' });
    expect(clickResult.content).toBeDefined();
    expect(clickResult.content[0].text).toContain('Click dispatched on "Click Me"');

    // 3. sentient_fill
    const fillResult = await server.executeTool('sentient_fill', { target: 'Type here...', text: 'Hello MCP' });
    expect(fillResult.content).toBeDefined();
    expect(fillResult.content[0].text).toContain('Typed "Hello MCP"');

    // 4. sentient_snapshot
    const snapshotResult = await server.executeTool('sentient_snapshot', {});
    expect(snapshotResult.content).toBeDefined();
    const snapshotData = JSON.parse(snapshotResult.content[0].text);
    expect(snapshotData.title).toBe('MCP Test Page');
    expect(snapshotData.interactiveCount).toBeGreaterThan(0);

    // 5. sentient_extract (links)
    const extractLinksResult = await server.executeTool('sentient_extract', { type: 'links' });
    const links = JSON.parse(extractLinksResult.content[0].text);
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0].href).toContain('https://example.com/item1');

    // 6. sentient_screenshot
    const screenshotResult = await server.executeTool('sentient_screenshot', {});
    expect(screenshotResult.content).toBeDefined();
    const imageContent = screenshotResult.content.find((c: any) => c.type === 'image');
    expect(imageContent).toBeDefined();
    expect(imageContent.mimeType).toBe('image/jpeg');
    expect(imageContent.data.length).toBeGreaterThan(100);
  });
});
