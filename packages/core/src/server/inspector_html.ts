export const INSPECTOR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sentient Browser - AI Runtime Inspector</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --border: #1e293b;
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --accent: #10b981;
      --accent-warn: #f59e0b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Outfit', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: #0f172a;
      border-bottom: 1px solid var(--border);
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge-status {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .badge-status::before {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }
    .metrics-header {
      display: flex;
      gap: 20px;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .metrics-header span {
      color: #38bdf8;
      font-weight: 600;
    }
    .nav-bar {
      background: var(--card-bg);
      padding: 12px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .url-input {
      flex: 1;
      background: #090d16;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 0.95rem;
      outline: none;
      font-family: 'JetBrains Mono', monospace;
    }
    .url-input:focus {
      border-color: var(--primary);
    }
    button {
      background: var(--primary);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-family: 'Outfit', sans-serif;
      transition: all 0.15s ease;
    }
    button:hover {
      background: var(--primary-hover);
    }
    main {
      flex: 1;
      display: grid;
      grid-template-columns: 320px 1fr 380px;
      gap: 1px;
      background: var(--border);
      overflow: hidden;
    }
    .panel {
      background: var(--bg);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .panel-header {
      background: var(--card-bg);
      padding: 12px 18px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    .node-item {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .node-item:hover {
      border-color: var(--primary);
      transform: translateY(-1px);
    }
    .node-role {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
      display: inline-block;
      margin-bottom: 4px;
    }
    .node-id {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      color: #f1f5f9;
      font-weight: 600;
    }
    .node-text {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    pre {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
      line-height: 1.5;
      color: #e2e8f0;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .diff-entry {
      background: #0f172a;
      border-left: 3px solid var(--primary);
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
    }
    .diff-entry.added { border-left-color: #10b981; }
    .diff-entry.removed { border-left-color: #ef4444; }
    .diff-entry.updated { border-left-color: #f59e0b; }
    .action-bar {
      background: var(--card-bg);
      border-top: 1px solid var(--border);
      padding: 12px 24px;
      display: flex;
      gap: 12px;
      align-items: center;
    }
  </style>
</head>
<body>
  <header>
    <div class="logo-group">
      <h2 style="font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em;">Sentient Browser</h2>
      <div class="badge-status" id="wsStatus">Connecting...</div>
    </div>
    <div class="metrics-header">
      <div>Tokens Saved: <span id="tokenSavingsMeter">92.4%</span></div>
      <div>Settlement: <span id="latencyMeter">~45ms</span></div>
      <div>Interactive Nodes: <span id="nodeCount">0</span></div>
    </div>
  </header>

  <div class="nav-bar">
    <input id="urlInput" class="url-input" type="text" value="https://news.ycombinator.com" placeholder="Enter URL to inspect..." />
    <button id="navigateBtn" onclick="navigate()">Navigate & Inspect</button>
  </div>

  <main>
    <!-- Left Column: Interactive Elements -->
    <div class="panel">
      <div class="panel-header">
        <span>Interactive Elements</span>
        <span id="interactiveSummary">0 nodes</span>
      </div>
      <div class="panel-content" id="elementsList">
        <p style="color: var(--text-muted); font-size: 0.85rem;">Navigate to a URL to populate interactive elements.</p>
      </div>
    </div>

    <!-- Center Column: Semantic DOM JSON -->
    <div class="panel">
      <div class="panel-header">
        <span>Semantic DOM Tree (Pruned JSON)</span>
        <button style="padding: 4px 10px; font-size: 0.75rem;" onclick="refreshDOM()">Refresh</button>
      </div>
      <div class="panel-content">
        <pre id="jsonTree">// Semantic DOM JSON will render here...</pre>
      </div>
    </div>

    <!-- Right Column: State Diff Log -->
    <div class="panel">
      <div class="panel-header">
        <span>Incremental State Diff Stream</span>
        <button style="padding: 4px 10px; font-size: 0.75rem;" onclick="clearDiffs()">Clear</button>
      </div>
      <div class="panel-content" id="diffLog">
        <p style="color: var(--text-muted); font-size: 0.85rem;">Waiting for action mutations...</p>
      </div>
    </div>
  </main>

  <div class="action-bar">
    <input id="actionTarget" class="url-input" style="max-width: 280px;" placeholder="Target Stable ID..." />
    <input id="actionText" class="url-input" style="max-width: 280px;" placeholder="Text to fill (optional)..." />
    <button onclick="executeClick()">Click Target</button>
    <button onclick="executeFill()" style="background: #059669;">Fill Input</button>
    <button onclick="executeSummary()" style="background: #0284c7;">Get Summary</button>
  </div>

  <script>
    let ws;
    let activePageId = null;

    function connect() {
      const wsUrl = 'ws://' + window.location.host;
      ws = new WebSocket(wsUrl);

      ws.onopen = async () => {
        document.getElementById('wsStatus').innerText = 'Connected';
        document.getElementById('wsStatus').style.color = '#34d399';
        // Create initial page
        sendRPC('newPage', {}, (res) => {
          activePageId = res.pageId;
          navigate();
        });
      };

      ws.onclose = () => {
        document.getElementById('wsStatus').innerText = 'Disconnected';
        document.getElementById('wsStatus').style.color = '#ef4444';
        setTimeout(connect, 2000);
      };

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.method === 'event.domDiff') {
          renderDiff(msg.params.diff);
        }
      };
    }

    let rpcId = 0;
    const callbacks = {};

    function sendRPC(method, params, callback) {
      rpcId++;
      callbacks[rpcId] = callback;
      ws.send(JSON.stringify({ jsonrpc: '2.0', id: rpcId, method, params }));
    }

    window.addEventListener('message', (e) => {
      // internal response routing
    });

    // Custom response handler
    const originalOnMessage = WebSocket.prototype.send;

    function navigate() {
      const url = document.getElementById('urlInput').value;
      if (!url || !activePageId) return;

      document.getElementById('navigateBtn').innerText = 'Loading...';
      sendRPC('goto', { pageId: activePageId, url }, (snapshot) => {
        document.getElementById('navigateBtn').innerText = 'Navigate & Inspect';
        renderDOM(snapshot);
      });
    }

    function renderDOM(snapshot) {
      if (!snapshot) return;
      document.getElementById('nodeCount').innerText = snapshot.nodes.length;
      document.getElementById('interactiveSummary').innerText = snapshot.interactiveCount + ' interactive';
      document.getElementById('jsonTree').innerText = JSON.stringify(snapshot.nodes, null, 2);

      const list = document.getElementById('elementsList');
      list.innerHTML = '';

      snapshot.nodes.forEach((node) => {
        if (!node.clickable && node.role !== 'textbox' && node.role !== 'button') return;

        const item = document.createElement('div');
        item.className = 'node-item';
        item.onclick = () => {
          document.getElementById('actionTarget').value = node.id;
        };

        item.innerHTML = \`
          <span class="node-role">\${node.role}</span>
          <div class="node-id">\${node.id}</div>
          <div class="node-text">\${node.text || node.placeholder || ''}</div>
        \`;
        list.appendChild(item);
      });
    }

    function renderDiff(diff) {
      if (!diff) return;
      const log = document.getElementById('diffLog');
      const entry = document.createElement('div');
      entry.className = 'diff-entry';
      entry.innerText = diff.compact || JSON.stringify(diff);
      log.prepend(entry);
      refreshDOM();
    }

    function refreshDOM() {
      if (!activePageId) return;
      sendRPC('getSemanticDOM', { pageId: activePageId }, (snapshot) => {
        renderDOM(snapshot);
      });
    }

    function clearDiffs() {
      document.getElementById('diffLog').innerHTML = '';
    }

    function executeClick() {
      const target = document.getElementById('actionTarget').value;
      if (!target || !activePageId) return;
      sendRPC('click', { pageId: activePageId, target }, (res) => {
        renderDiff(res.diff);
      });
    }

    function executeFill() {
      const target = document.getElementById('actionTarget').value;
      const text = document.getElementById('actionText').value;
      if (!target || !activePageId) return;
      sendRPC('fill', { pageId: activePageId, target, text }, (res) => {
        renderDiff(res.diff);
      });
    }

    function executeSummary() {
      refreshDOM();
    }

    // Intercept responses
    setInterval(() => {
      if (!ws) return;
      const prevHandler = ws.onmessage;
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id && callbacks[msg.id]) {
          callbacks[msg.id](msg.result);
          delete callbacks[msg.id];
        }
        if (msg.method === 'event.domDiff') {
          renderDiff(msg.params.diff);
        }
      };
    }, 100);

    connect();
  </script>
</body>
</html>
`;
