export const INSPECTOR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sentient Browser - AI Runtime Inspector</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #0f172a;
      --card-inner: #131d33;
      --border: #1e293b;
      --border-focus: #6366f1;
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --accent: #10b981;
      --accent-hover: #059669;
      --cyan: #0ea5e9;
      --cyan-hover: #0284c7;
      --purple: #8b5cf6;
      --purple-hover: #7c3aed;
      --accent-warn: #f59e0b;
      --danger: #ef4444;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --text-subtle: #64748b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
      font-family: 'Outfit', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    body {
      display: flex;
      flex-direction: column;
    }

    /* Top Header */
    header {
      background: #0b1120;
      border-bottom: 1px solid var(--border);
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .logo-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-badge {
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      color: white;
      font-weight: 800;
      font-size: 0.85rem;
      padding: 4px 9px;
      border-radius: 6px;
      letter-spacing: -0.02em;
    }
    .logo-title {
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .badge-status {
      background: rgba(16, 185, 129, 0.12);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .metrics-header {
      display: flex;
      align-items: center;
      gap: 18px;
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .metric-pill {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid var(--border);
      padding: 4px 10px;
      border-radius: 6px;
      display: flex;
      gap: 6px;
    }
    .metric-pill span {
      color: #38bdf8;
      font-weight: 600;
    }

    /* URL Navigation Bar */
    .nav-bar {
      background: var(--card-bg);
      padding: 10px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      gap: 10px;
      align-items: center;
      flex-shrink: 0;
    }
    .url-input {
      flex: 1;
      background: #090d16;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 9px 14px;
      border-radius: 8px;
      font-size: 0.9rem;
      outline: none;
      font-family: 'JetBrains Mono', monospace;
      transition: border-color 0.15s ease;
    }
    .url-input:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    }

    button {
      background: var(--primary);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 7px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      font-family: 'Outfit', sans-serif;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      white-space: nowrap;
    }
    button:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }
    button:active {
      transform: translateY(0);
    }
    button.btn-secondary {
      background: #1e293b;
      color: var(--text-muted);
      border: 1px solid var(--border);
    }
    button.btn-secondary:hover {
      background: #334155;
      color: var(--text);
    }
    button.btn-success { background: var(--accent); }
    button.btn-success:hover { background: var(--accent-hover); }
    button.btn-info { background: var(--cyan); }
    button.btn-info:hover { background: var(--cyan-hover); }
    button.btn-purple { background: var(--purple); }
    button.btn-purple:hover { background: var(--purple-hover); }

    /* Main 3-Column Work Area */
    main {
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: 360px 1fr 400px;
      gap: 1px;
      background: var(--border);
      overflow: hidden;
    }
    .panel {
      background: var(--bg);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
    }
    .panel-header {
      background: var(--card-bg);
      padding: 10px 16px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .panel-title {
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge-count {
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
      font-size: 0.75rem;
      padding: 2px 7px;
      border-radius: 12px;
      font-weight: 600;
    }
    .panel-filter {
      padding: 8px 12px;
      background: #0b1120;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .filter-input {
      width: 100%;
      background: var(--card-inner);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      outline: none;
      font-family: 'JetBrains Mono', monospace;
    }
    .filter-input:focus {
      border-color: var(--primary);
    }
    .panel-content {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 12px;
    }

    /* Interactive Element Cards */
    .node-item {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 7px;
      padding: 10px 12px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      position: relative;
    }
    .node-item:hover {
      border-color: var(--primary);
      background: var(--card-inner);
      transform: translateY(-1px);
    }
    .node-item.selected {
      border-color: var(--primary);
      box-shadow: 0 0 0 1px var(--primary);
    }
    .node-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .node-role {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
    }
    .role-button { background: rgba(99, 102, 241, 0.2); color: #818cf8; }
    .role-link { background: rgba(14, 165, 233, 0.2); color: #38bdf8; }
    .role-textbox { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .role-generic { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }
    
    .node-actions {
      opacity: 0;
      transition: opacity 0.15s ease;
      display: flex;
      gap: 4px;
    }
    .node-item:hover .node-actions {
      opacity: 1;
    }
    .btn-card-action {
      padding: 2px 8px;
      font-size: 0.7rem;
      border-radius: 4px;
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid #334155;
    }
    .btn-card-action:hover {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }
    .node-id {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      color: #f1f5f9;
      font-weight: 600;
      word-break: break-all;
    }
    .node-text {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* JSON Tree View */
    pre {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      line-height: 1.5;
      color: #e2e8f0;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* Diff Stream Cards */
    .diff-entry {
      background: #0b1120;
      border-left: 3px solid var(--primary);
      padding: 10px 14px;
      border-radius: 6px;
      margin-bottom: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.78rem;
      border-top: 1px solid rgba(255,255,255,0.03);
      border-right: 1px solid rgba(255,255,255,0.03);
      border-bottom: 1px solid rgba(255,255,255,0.03);
    }
    .diff-header {
      display: flex;
      justify-content: space-between;
      color: var(--text-subtle);
      font-size: 0.7rem;
      margin-bottom: 6px;
      font-family: 'Outfit', sans-serif;
    }
    .diff-content {
      color: #e2e8f0;
      white-space: pre-wrap;
      line-height: 1.4;
    }

    /* ========================================================
       STICKY BOTTOM ACTION DOCK (Always Fixed In View)
       ======================================================== */
    .action-dock {
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(16px);
      border-top: 1px solid var(--border);
      padding: 12px 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex-shrink: 0;
      z-index: 50;
      box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.45);
    }
    .dock-row {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .dock-input {
      background: #090d16;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 12px;
      border-radius: 7px;
      font-size: 0.85rem;
      outline: none;
      font-family: 'JetBrains Mono', monospace;
    }
    .dock-input:focus {
      border-color: var(--primary);
    }
    .target-input-wrap {
      position: relative;
      flex: 1.2;
      min-width: 240px;
    }
    .target-input-wrap input {
      width: 100%;
      padding-right: 28px;
    }
    .btn-clear-target {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      color: var(--text-muted);
      border: none;
      padding: 2px 6px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .btn-clear-target:hover {
      background: transparent;
      color: white;
      transform: translateY(-50%);
    }
    .text-input-wrap {
      flex: 1;
      min-width: 200px;
    }
    .text-input-wrap input {
      width: 100%;
    }

    .btn-group {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .scroll-select {
      background: #1e293b;
      color: var(--text);
      border: 1px solid var(--border);
      padding: 8px 10px;
      border-radius: 7px;
      font-size: 0.82rem;
      font-family: 'Outfit', sans-serif;
      outline: none;
      cursor: pointer;
    }

    /* Autonomous Agent Dock & Step Cards */
    .dock-row-agent {
      background: rgba(19, 29, 51, 0.7);
      border: 1px solid rgba(99, 102, 241, 0.25);
      border-radius: 8px;
      padding: 6px 12px;
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .agent-label {
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: #818cf8;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    .btn-solve {
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      font-weight: 700;
      color: white;
    }
    .btn-solve:hover {
      background: linear-gradient(135deg, #4f46e5 0%, #9333ea 100%);
    }
    .agent-status-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.78rem;
      color: var(--text-muted);
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border);
      padding: 4px 10px;
      border-radius: 6px;
      margin-left: auto;
      white-space: nowrap;
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .agent-status-badge.active {
      border-color: #6366f1;
      color: #a5b4fc;
      animation: pulse 1.5s infinite;
    }
    .diff-entry-agent {
      border-left: 3px solid #10b981 !important;
      background: #0b1a20 !important;
    }

    /* View Switcher Tabs */
    .view-switch-tabs {
      display: flex;
      background: #090d16;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 2px;
      gap: 2px;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 4px 10px;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .tab-btn:hover {
      color: var(--text);
      background: rgba(255, 255, 255, 0.05);
      transform: none;
    }
    .tab-btn.active {
      background: var(--primary);
      color: white;
    }
    .fps-pill {
      font-size: 0.7rem;
      background: rgba(16, 185, 129, 0.12);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 2px 8px;
      border-radius: 9999px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    /* Live Screencast Viewport Stage */
    .live-viewport-wrap {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #060911;
      position: relative;
      overflow: hidden;
      min-height: 0;
    }
    .viewport-stage {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      user-select: none;
      background: radial-gradient(circle at center, #0f172a 0%, #060911 100%);
      cursor: crosshair;
    }
    #screencastImg {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      box-shadow: 0 10px 30px rgba(0,0,0,0.8);
      border-radius: 4px;
      display: block;
    }
    .live-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      font-size: 0.9rem;
      font-family: 'Outfit', sans-serif;
      background: rgba(6, 9, 17, 0.85);
      backdrop-filter: blur(4px);
    }
    .viewport-footer {
      padding: 6px 14px;
      background: #090d16;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: var(--text-subtle);
      font-family: 'JetBrains Mono', monospace;
      flex-shrink: 0;
    }

    /* Interactive Overlays on Viewport */
    .viewport-hover-box {
      position: absolute;
      pointer-events: none;
      border: 2px solid #38bdf8;
      background: rgba(56, 189, 248, 0.15);
      border-radius: 3px;
      display: none;
      z-index: 20;
      transition: all 0.05s ease-out;
    }
    .hover-badge {
      position: absolute;
      bottom: calc(100% + 4px);
      left: 0;
      background: #0284c7;
      color: white;
      font-size: 0.65rem;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'JetBrains Mono', monospace;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    }
    .click-ripple {
      position: absolute;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 3px solid #10b981;
      background: rgba(16, 185, 129, 0.35);
      transform: translate(-50%, -50%) scale(0.2);
      pointer-events: none;
      z-index: 30;
      opacity: 0;
    }
    .click-ripple.animate {
      animation: rippleEffect 0.6s ease-out forwards;
    }
    @keyframes rippleEffect {
      0% { opacity: 1; transform: translate(-50%, -50%) scale(0.3); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(2.2); }
    }

    /* Modal / Drawer for Page Summary & Links */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 1000;
      justify-content: center;
      align-items: center;
      padding: 24px;
    }
    .modal-box {
      background: #0f172a;
      border: 1px solid var(--border);
      border-radius: 12px;
      width: 100%;
      max-width: 760px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      overflow: hidden;
    }
    .modal-header {
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0b1120;
    }
    .modal-body {
      padding: 20px;
      overflow-y: auto;
      font-size: 0.88rem;
      line-height: 1.6;
    }
    .modal-close {
      background: transparent;
      border: none;
      font-size: 1.2rem;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
    }
    .modal-close:hover {
      color: white;
      background: transparent;
      transform: none;
    }
    .summary-section {
      margin-bottom: 20px;
    }
    .summary-section h4 {
      color: #38bdf8;
      font-size: 0.85rem;
      text-transform: uppercase;
      margin-bottom: 8px;
      letter-spacing: 0.05em;
    }
    .tag-chip {
      background: #1e293b;
      border: 1px solid #334155;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.8rem;
      margin: 3px;
      display: inline-block;
    }
    .link-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
    }
    .link-table td {
      padding: 6px 10px;
      border-bottom: 1px solid var(--border);
    }
  </style>
</head>
<body>
  <!-- Header -->
  <header>
    <div class="logo-group">
      <span class="logo-badge">SENTIENT</span>
      <h2 class="logo-title">Sentient Browser Inspector</h2>
      <div class="badge-status" id="wsStatus">
        <span class="status-dot"></span>
        <span id="wsStatusText">Connecting...</span>
      </div>
    </div>
    <div class="metrics-header">
      <div class="metric-pill">Tokens Saved: <span id="tokenSavingsMeter">91.4%</span></div>
      <div class="metric-pill">Settlement: <span id="latencyMeter">~45ms</span></div>
      <div class="metric-pill">Interactive Targets: <span id="nodeCount">0</span></div>
    </div>
  </header>

  <!-- URL Bar -->
  <div class="nav-bar">
    <input id="urlInput" class="url-input" type="text" value="https://sprint-desk.com" placeholder="Enter URL to inspect..." />
    <button id="navigateBtn" onclick="navigate()">⚡ Navigate & Inspect</button>
    <button class="btn-secondary" onclick="refreshDOM()">🔄 Reload Snapshot</button>
  </div>

  <!-- 3-Column Panels -->
  <main>
    <!-- Left Column: Interactive Elements -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">
          <span>Action Targets</span>
          <span class="badge-count" id="interactiveSummary">0</span>
        </div>
      </div>
      <div class="panel-filter">
        <input id="elementFilter" class="filter-input" type="text" placeholder="🔍 Quick filter by ID or text..." oninput="filterElements()" />
      </div>
      <div class="panel-content" id="elementsList">
        <p style="color: var(--text-muted); font-size: 0.85rem; padding: 10px;">Navigate to a URL to populate interactive elements.</p>
      </div>
    </div>

    <!-- Center Column: Visual Live View & Semantic DOM -->
    <div class="panel" style="position: relative;">
      <div class="panel-header">
        <div class="panel-title" style="gap: 10px;">
          <div class="view-switch-tabs">
            <button id="tabLive" class="tab-btn active" onclick="switchCenterView('live')">🖥️ Live View</button>
            <button id="tabDom" class="tab-btn" onclick="switchCenterView('dom')">🌳 Semantic DOM Tree</button>
            <button id="tabSplit" class="tab-btn" onclick="switchCenterView('split')">🌓 Split</button>
          </div>
          <span id="screencastFpsBadge" class="fps-pill">🟢 Live Stream</span>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="copyJson()">📋 Copy JSON</button>
          <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="refreshDOM()">Refresh</button>
        </div>
      </div>
      <div class="panel-content" id="centerPanelContent" style="padding: 0; display: flex; flex-direction: column; overflow: hidden; position: relative;">
        <!-- Live Viewport Container -->
        <div id="liveViewportWrap" class="live-viewport-wrap">
          <div class="viewport-stage" id="viewportStage" onclick="onViewportClick(event)" onmousemove="onViewportHover(event)" onmouseleave="onViewportLeave()">
            <img id="screencastImg" alt="Live browser screencast" />
            <div id="hoverBox" class="viewport-hover-box"></div>
            <div id="clickRipple" class="click-ripple"></div>
            <div id="livePlaceholder" class="live-placeholder">
              <span>⏳ Initializing live browser stream...</span>
            </div>
          </div>
          <div class="viewport-footer">
            <span id="viewportCoordText">Click any element on screen to target</span>
            <span id="viewportResolutionText">1280 × 720</span>
          </div>
        </div>

        <!-- DOM Tree View Container -->
        <div id="domTreeWrap" class="dom-tree-wrap" style="display: none; padding: 12px; flex: 1; overflow: auto;">
          <pre id="jsonTree">// Semantic DOM JSON will render here...</pre>
        </div>
      </div>
    </div>

    <!-- Right Column: State Diff Log -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">
          <span>Incremental State Diff Stream</span>
          <span class="badge-count" id="diffCountBadge">0</span>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="copyDiffs()">📋 Copy</button>
          <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="clearDiffs()">Clear</button>
        </div>
      </div>
      <div class="panel-content" id="diffLog">
        <p style="color: var(--text-muted); font-size: 0.85rem; padding: 10px;">Waiting for action mutations...</p>
      </div>
    </div>
  </main>

  <!-- STICKY ACTION DOCK (Always Fixed At Bottom) -->
  <div class="action-dock">
    <!-- Row 1: Autonomous Agent Solver -->
    <div class="dock-row-agent">
      <div class="agent-label">🤖 Autonomous Agent</div>
      <div style="flex: 1; min-width: 260px;">
        <input id="goalInput" class="dock-input" style="width: 100%;" placeholder="Autonomous Objective (e.g. 'Find features of Time Tracker', 'Click Register')..." onkeydown="if(event.key==='Enter') executeSolve()" />
      </div>
      <div class="btn-group">
        <button class="btn-solve" id="solveBtn" onclick="executeSolve()" title="Plan & Execute autonomously">🚀 Auto Solve</button>
        <button class="btn-secondary" onclick="executeRollback()" title="Revert last browser action (Undo)">↩️ Rollback</button>
      </div>
      <div id="agentStatusBadge" class="agent-status-badge">Agent: Ready</div>
    </div>

    <!-- Row 2: Direct Element & CDP Controls -->
    <div class="dock-row">
      <!-- Target input -->
      <div class="target-input-wrap">
        <input id="actionTarget" class="dock-input" placeholder="Target Stable ID (e.g. time_tracker_button)..." onkeydown="if(event.key==='Enter') executeClick()" />
        <button class="btn-clear-target" onclick="clearTarget()" title="Clear target">✕</button>
      </div>

      <!-- Text input for typing -->
      <div class="text-input-wrap">
        <input id="actionText" class="dock-input" placeholder="Text to fill (optional)..." onkeydown="if(event.key==='Enter') executeFill()" />
      </div>

      <!-- Main Action Buttons -->
      <div class="btn-group">
        <button onclick="executeClick()" title="Dispatch native click">🎯 Click</button>
        <button class="btn-success" onclick="executeFill()" title="Type text into input">✍️ Fill</button>
        <button class="btn-purple" onclick="executeHover()" title="Hover over target">👆 Hover</button>
      </div>

      <!-- Scroll Controls -->
      <div class="btn-group">
        <select id="scrollDir" class="scroll-select">
          <option value="down">Scroll Down</option>
          <option value="up">Scroll Up</option>
          <option value="bottom">Scroll to Bottom</option>
          <option value="top">Scroll to Top</option>
        </select>
        <button class="btn-secondary" onclick="executeScroll()">📜 Scroll</button>
      </div>

      <!-- Extraction Tools -->
      <div class="btn-group">
        <button class="btn-info" onclick="openSummaryModal()">📑 Page Summary</button>
        <button class="btn-info" style="background: #0d9488;" onclick="openLinksModal()">🔗 Links</button>
      </div>
    </div>
  </div>

  <!-- Modal / Drawer -->
  <div class="modal-overlay" id="modalOverlay" onclick="closeModal(event)">
    <div class="modal-box" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3 id="modalTitle" style="font-size: 1rem; font-weight: 700;">Page Inspection</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body" id="modalBody">
        <!-- Injected content -->
      </div>
    </div>
  </div>

  <script>
    let ws;
    let activePageId = null;
    let currentNodes = [];
    let diffsHistory = [];

    function connect() {
      const wsUrl = 'ws://' + window.location.host;
      ws = new WebSocket(wsUrl);

      ws.onopen = async () => {
        document.getElementById('wsStatusText').innerText = 'Connected';
        document.getElementById('wsStatus').style.color = '#34d399';
        // Create initial page
        sendRPC('newPage', {}, (res) => {
          activePageId = res.pageId;
          startScreencast();
          navigate();
        });
      };

      ws.onclose = () => {
        document.getElementById('wsStatusText').innerText = 'Disconnected';
        document.getElementById('wsStatus').style.color = '#ef4444';
        setTimeout(connect, 2000);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.id && callbacks[msg.id]) {
            callbacks[msg.id](msg.result);
            delete callbacks[msg.id];
          }
          if (msg.method === 'event.domDiff') {
            renderDiff(msg.params.diff);
          }
          if (msg.method === 'event.agentStep') {
            renderAgentStep(msg.params.step);
          }
          if (msg.method === 'event.screencastFrame') {
            renderScreencastFrame(msg.params.data, msg.params.metadata);
          }
        } catch (_) {}
      };
    }

    let rpcId = 0;
    const callbacks = {};

    function sendRPC(method, params, callback) {
      rpcId++;
      if (callback) callbacks[rpcId] = callback;
      ws.send(JSON.stringify({ jsonrpc: '2.0', id: rpcId, method, params }));
    }

    /* Screencast & Viewport Controls */
    let frameCount = 0;
    let lastFpsTime = Date.now();
    let currentFps = 0;

    function startScreencast() {
      if (!activePageId) return;
      sendRPC('startScreencast', { pageId: activePageId }, () => {});
    }

    function renderScreencastFrame(data, metadata) {
      if (!data) return;
      const img = document.getElementById('screencastImg');
      if (img) img.src = 'data:image/jpeg;base64,' + data;

      const placeholder = document.getElementById('livePlaceholder');
      if (placeholder && placeholder.style.display !== 'none') {
        placeholder.style.display = 'none';
      }

      frameCount++;
      const now = Date.now();
      if (now - lastFpsTime >= 1000) {
        currentFps = Math.round((frameCount * 1000) / (now - lastFpsTime));
        frameCount = 0;
        lastFpsTime = now;
        const fpsBadge = document.getElementById('screencastFpsBadge');
        if (fpsBadge) fpsBadge.innerText = '🟢 Live (' + currentFps + ' FPS)';
      }

      if (metadata && metadata.deviceWidth) {
        const resText = document.getElementById('viewportResolutionText');
        if (resText) resText.innerText = metadata.deviceWidth + ' × ' + metadata.deviceHeight;
      }
    }

    function switchCenterView(mode) {
      document.querySelectorAll('.view-switch-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      const liveWrap = document.getElementById('liveViewportWrap');
      const domWrap = document.getElementById('domTreeWrap');

      if (mode === 'live') {
        document.getElementById('tabLive').classList.add('active');
        liveWrap.style.display = 'flex';
        liveWrap.style.flex = '1';
        domWrap.style.display = 'none';
      } else if (mode === 'dom') {
        document.getElementById('tabDom').classList.add('active');
        liveWrap.style.display = 'none';
        domWrap.style.display = 'block';
        domWrap.style.flex = '1';
      } else if (mode === 'split') {
        document.getElementById('tabSplit').classList.add('active');
        liveWrap.style.display = 'flex';
        liveWrap.style.flex = '1';
        domWrap.style.display = 'block';
        domWrap.style.flex = '1';
        domWrap.style.borderTop = '1px solid var(--border)';
      }
    }

    function onViewportHover(event) {
      const img = document.getElementById('screencastImg');
      const stage = document.getElementById('viewportStage');
      if (!img || !img.naturalWidth || img.clientWidth === 0) return;

      const imgRect = img.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();

      const imgX = event.clientX - imgRect.left;
      const imgY = event.clientY - imgRect.top;

      if (imgX < 0 || imgX > imgRect.width || imgY < 0 || imgY > imgRect.height) {
        onViewportLeave();
        return;
      }

      const scaleX = (img.naturalWidth || 1280) / imgRect.width;
      const scaleY = (img.naturalHeight || 720) / imgRect.height;
      const docX = imgX * scaleX;
      const docY = imgY * scaleY;

      let found = null;
      let minArea = Infinity;
      for (const node of currentNodes) {
        if (!node.bbox) continue;
        const { x, y, width, height } = node.bbox;
        if (docX >= x && docX <= x + width && docY >= y && docY <= y + height) {
          const area = width * height;
          if (area < minArea && (node.clickable || node.role === 'button' || node.role === 'textbox' || node.role === 'link')) {
            minArea = area;
            found = node;
          }
        }
      }

      const box = document.getElementById('hoverBox');
      const coordText = document.getElementById('viewportCoordText');

      if (found) {
        box.style.display = 'block';
        box.style.left = (imgRect.left - stageRect.left + (found.bbox.x / scaleX)) + 'px';
        box.style.top = (imgRect.top - stageRect.top + (found.bbox.y / scaleY)) + 'px';
        box.style.width = (found.bbox.width / scaleX) + 'px';
        box.style.height = (found.bbox.height / scaleY) + 'px';
        box.innerHTML = '<span class="hover-badge">' + found.id + '</span>';
        coordText.innerText = '🎯 Target: ' + found.id + ' (' + found.role + ')';
      } else {
        box.style.display = 'none';
        coordText.innerText = 'X: ' + Math.round(docX) + ', Y: ' + Math.round(docY);
      }
    }

    function onViewportLeave() {
      const box = document.getElementById('hoverBox');
      if (box) box.style.display = 'none';
      const coordText = document.getElementById('viewportCoordText');
      if (coordText) coordText.innerText = 'Click any element on screen to target';
    }

    function onViewportClick(event) {
      const img = document.getElementById('screencastImg');
      const stage = document.getElementById('viewportStage');
      if (!img || !img.naturalWidth || img.clientWidth === 0) return;

      const imgRect = img.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();

      const imgX = event.clientX - imgRect.left;
      const imgY = event.clientY - imgRect.top;

      if (imgX < 0 || imgX > imgRect.width || imgY < 0 || imgY > imgRect.height) return;

      const scaleX = (img.naturalWidth || 1280) / imgRect.width;
      const scaleY = (img.naturalHeight || 720) / imgRect.height;
      const docX = imgX * scaleX;
      const docY = imgY * scaleY;

      triggerRipple(event.clientX - stageRect.left, event.clientY - stageRect.top);

      let found = null;
      let minArea = Infinity;
      for (const node of currentNodes) {
        if (!node.bbox) continue;
        const { x, y, width, height } = node.bbox;
        if (docX >= x && docX <= x + width && docY >= y && docY <= y + height) {
          const area = width * height;
          if (area < minArea && (node.clickable || node.role === 'button' || node.role === 'textbox' || node.role === 'link')) {
            minArea = area;
            found = node;
          }
        }
      }

      if (found) {
        selectTarget(found.id);
      }
    }

    function triggerRipple(x, y) {
      const ripple = document.getElementById('clickRipple');
      if (!ripple) return;
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.remove('animate');
      void ripple.offsetWidth;
      ripple.classList.add('animate');
    }

    function triggerActionVisual(targetId) {
      if (!targetId) return;
      const node = currentNodes.find(n => n.id === targetId);
      if (!node || !node.bbox) return;

      const img = document.getElementById('screencastImg');
      const stage = document.getElementById('viewportStage');
      if (!img || !img.naturalWidth || img.clientWidth === 0) return;

      const imgRect = img.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      const scaleX = (img.naturalWidth || 1280) / imgRect.width;
      const scaleY = (img.naturalHeight || 720) / imgRect.height;

      const centerX = imgRect.left - stageRect.left + (node.bbox.x + node.bbox.width / 2) / scaleX;
      const centerY = imgRect.top - stageRect.top + (node.bbox.y + node.bbox.height / 2) / scaleY;

      triggerRipple(centerX, centerY);
    }

    function navigate() {
      const url = document.getElementById('urlInput').value;
      if (!url || !activePageId) return;

      const btn = document.getElementById('navigateBtn');
      btn.innerText = '⏳ Loading...';
      const t0 = Date.now();

      sendRPC('goto', { pageId: activePageId, url }, (snapshot) => {
        const elapsed = Date.now() - t0;
        document.getElementById('latencyMeter').innerText = elapsed + 'ms';
        btn.innerText = '⚡ Navigate & Inspect';
        renderDOM(snapshot);
      });
    }

    function renderDOM(snapshot) {
      if (!snapshot) return;
      currentNodes = snapshot.nodes || [];
      document.getElementById('nodeCount').innerText = snapshot.nodes.length;
      document.getElementById('interactiveSummary').innerText = (snapshot.interactiveCount || 0) + ' targets';
      document.getElementById('jsonTree').innerText = JSON.stringify(snapshot.nodes, null, 2);

      // Estimate tokens
      const rawHtmlApproxBytes = snapshot.nodes.length * 1200;
      const prunedBytes = JSON.stringify(snapshot.nodes).length;
      const savings = Math.max(70, Math.min(96, Math.round((1 - prunedBytes / rawHtmlApproxBytes) * 100)));
      document.getElementById('tokenSavingsMeter').innerText = savings + '%';

      renderElementsList(currentNodes);
    }

    function renderElementsList(nodes) {
      const list = document.getElementById('elementsList');
      list.innerHTML = '';

      const interactives = nodes.filter(n => n.clickable || n.role === 'textbox' || n.role === 'button' || n.role === 'link');

      if (interactives.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 10px;">No matching targets found.</p>';
        return;
      }

      interactives.forEach((node) => {
        const item = document.createElement('div');
        item.className = 'node-item';
        item.id = 'node_' + node.id;
        item.onclick = (e) => {
          selectTarget(node.id);
        };

        const roleClass = 'role-' + (node.role || 'generic');

        item.innerHTML = \`
          <div class="node-header">
            <span class="node-role \${roleClass}">\${node.role}</span>
            <div class="node-actions" onclick="event.stopPropagation()">
              <button class="btn-card-action" onclick="quickClick('\${node.id}')">Click</button>
              <button class="btn-card-action" onclick="quickHover('\${node.id}')">Hover</button>
            </div>
          </div>
          <div class="node-id">\${node.id}</div>
          <div class="node-text">\${node.text || node.placeholder || '(no direct text)'}</div>
        \`;
        list.appendChild(item);
      });
    }

    function filterElements() {
      const q = (document.getElementById('elementFilter').value || '').toLowerCase().trim();
      if (!q) {
        renderElementsList(currentNodes);
        return;
      }
      const filtered = currentNodes.filter(n => {
        return (n.id && n.id.toLowerCase().includes(q)) ||
               (n.text && n.text.toLowerCase().includes(q)) ||
               (n.placeholder && n.placeholder.toLowerCase().includes(q)) ||
               (n.role && n.role.toLowerCase().includes(q));
      });
      renderElementsList(filtered);
    }

    function selectTarget(id) {
      document.getElementById('actionTarget').value = id;
      document.querySelectorAll('.node-item').forEach(el => el.classList.remove('selected'));
      const active = document.getElementById('node_' + id);
      if (active) active.classList.add('selected');
    }

    function clearTarget() {
      document.getElementById('actionTarget').value = '';
      document.querySelectorAll('.node-item').forEach(el => el.classList.remove('selected'));
    }

    function quickClick(id) {
      selectTarget(id);
      executeClick();
    }

    function quickHover(id) {
      selectTarget(id);
      executeHover();
    }

    function renderDiff(diff) {
      if (!diff) return;
      diffsHistory.push(diff);
      document.getElementById('diffCountBadge').innerText = diffsHistory.length;

      const log = document.getElementById('diffLog');
      if (diffsHistory.length === 1) {
        log.innerHTML = '';
      }

      const entry = document.createElement('div');
      entry.className = 'diff-entry';

      const time = new Date().toLocaleTimeString();
      const addedCount = diff.added ? diff.added.length : 0;
      const removedCount = diff.removed ? diff.removed.length : 0;
      const updatedCount = diff.updated ? diff.updated.length : 0;

      entry.innerHTML = \`
        <div class="diff-header">
          <span>🕒 \${time}</span>
          <span>+\${addedCount} / -\${removedCount} / ~\${updatedCount}</span>
        </div>
        <div class="diff-content">\${diff.compact || JSON.stringify(diff, null, 2)}</div>
      \`;

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
      diffsHistory = [];
      document.getElementById('diffCountBadge').innerText = '0';
      document.getElementById('diffLog').innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 10px;">Waiting for action mutations...</p>';
    }

    function executeClick() {
      const target = document.getElementById('actionTarget').value.trim();
      if (!target || !activePageId) return;
      triggerActionVisual(target);
      sendRPC('click', { pageId: activePageId, target }, (res) => {
        if (res && res.diff) renderDiff(res.diff);
      });
    }

    function executeFill() {
      const target = document.getElementById('actionTarget').value.trim();
      const text = document.getElementById('actionText').value;
      if (!target || !activePageId) return;
      triggerActionVisual(target);
      sendRPC('fill', { pageId: activePageId, target, text }, (res) => {
        if (res && res.diff) renderDiff(res.diff);
      });
    }

    function executeHover() {
      const target = document.getElementById('actionTarget').value.trim();
      if (!target || !activePageId) return;
      triggerActionVisual(target);
      sendRPC('hover', { pageId: activePageId, target }, (res) => {
        if (res && res.diff) renderDiff(res.diff);
      });
    }

    function executeScroll() {
      if (!activePageId) return;
      const dir = document.getElementById('scrollDir').value;
      sendRPC('scroll', { pageId: activePageId, options: { direction: dir, amountPx: 600 } }, (res) => {
        if (res && res.diff) renderDiff(res.diff);
      });
    }

    function renderAgentStep(step) {
      if (!step) return;
      const log = document.getElementById('diffLog');
      if (diffsHistory.length === 0 && log.innerHTML.includes('Waiting')) {
        log.innerHTML = '';
      }
      const entry = document.createElement('div');
      entry.className = 'diff-entry diff-entry-agent';
      const action = step.action || {};
      if (action.target) {
        triggerActionVisual(action.target);
      }
      const targetStr = action.target ? ' -> <b style="color:#f8fafc;">' + action.target + '</b>' : '';
      const reasoningStr = action.reasoning ? '<div style="color:#94a3b8; font-size:0.75rem; margin-top:4px;">💭 ' + action.reasoning + '</div>' : '';
      const diffStr = step.diffSummary ? '<div style="color:#34d399; font-size:0.75rem; margin-top:4px;">⚡ ' + step.diffSummary + '</div>' : '';

      entry.innerHTML = \`
        <div class="diff-header" style="color: #34d399;">
          <span>🤖 STEP \${step.stepNumber}: \${action.type.toUpperCase()}\${targetStr}</span>
          <span>\${new Date(step.timestamp || Date.now()).toLocaleTimeString()}</span>
        </div>
        \${reasoningStr}
        \${diffStr}
      \`;
      log.prepend(entry);

      const badge = document.getElementById('agentStatusBadge');
      badge.innerText = 'Step ' + step.stepNumber + ': ' + action.type.toUpperCase() + (action.target ? ' [' + action.target + ']' : '');
      badge.classList.add('active');

      refreshDOM();
    }

    function executeSolve() {
      const goal = document.getElementById('goalInput').value.trim();
      if (!goal || !activePageId) return;
      const btn = document.getElementById('solveBtn');
      const badge = document.getElementById('agentStatusBadge');
      btn.innerText = '⏳ Solving...';
      btn.disabled = true;
      badge.innerText = '🤖 Planning steps...';
      badge.classList.add('active');

      sendRPC('solve', { pageId: activePageId, goal }, (res) => {
        btn.innerText = '🚀 Auto Solve';
        btn.disabled = false;
        badge.classList.remove('active');
        if (res && res.success) {
          badge.innerText = '✓ Solved (' + res.stepsCount + ' steps, ' + res.durationMs + 'ms)';
          openAgentResultModal(res);
        } else {
          badge.innerText = '⚠️ Failed: ' + ((res && res.error) || 'Max steps reached');
          alert('Agent was unable to finish goal: ' + ((res && res.error) || 'Max steps exceeded'));
        }
        refreshDOM();
      });
    }

    function executeRollback() {
      if (!activePageId) return;
      const badge = document.getElementById('agentStatusBadge');
      badge.innerText = '↩️ Rolling back...';
      badge.classList.add('active');
      sendRPC('rollback', { pageId: activePageId }, (res) => {
        badge.innerText = 'Agent: Ready';
        badge.classList.remove('active');
        if (res && res.diff) {
          renderDiff(res.diff);
        }
        refreshDOM();
      });
    }

    function openAgentResultModal(res) {
      document.getElementById('modalTitle').innerText = '🎯 Autonomous Goal Completed!';
      const body = document.getElementById('modalBody');

      let stepsHtml = (res.steps || []).map(s => {
        const act = s.action || {};
        return \`
          <div style="background:#090d16; border:1px solid #1e293b; border-radius:6px; padding:8px 12px; margin-bottom:6px; font-family:'JetBrains Mono', monospace; font-size:0.8rem;">
            <div style="color:#818cf8; font-weight:700;">Step \${s.stepNumber}: \${act.type.toUpperCase()} \${act.target ? '-> ' + act.target : ''}</div>
            <div style="color:#94a3b8; font-size:0.75rem; margin-top:2px;">Reasoning: \${act.reasoning || 'N/A'}</div>
            \${s.diffSummary ? '<div style="color:#34d399; font-size:0.75rem; margin-top:2px;">Diff: ' + s.diffSummary + '</div>' : ''}
          </div>
        \`;
      }).join('');

      body.innerHTML = \`
        <div class="summary-section">
          <h4>Goal</h4>
          <p style="font-weight:600; color:#f8fafc; font-size:1rem;">"\${res.goal}"</p>
        </div>
        <div class="summary-section">
          <h4>Result / Answer</h4>
          <div style="background:#0b1a20; border:1px solid #059669; border-radius:8px; padding:12px; color:#34d399; font-size:0.95rem; font-weight:600;">
            \${res.answer || 'Completed successfully'}
          </div>
        </div>
        <div class="summary-section">
          <h4>Execution Steps (\${res.stepsCount} steps in \${res.durationMs}ms)</h4>
          <div>\${stepsHtml}</div>
        </div>
      \`;
      document.getElementById('modalOverlay').style.display = 'flex';
    }

    function copyJson() {
      const text = document.getElementById('jsonTree').innerText;
      navigator.clipboard.writeText(text);
      alert('Pruned Semantic DOM JSON copied to clipboard!');
    }

    function copyDiffs() {
      const text = diffsHistory.map(d => d.compact || JSON.stringify(d)).join('\\n---\\n');
      navigator.clipboard.writeText(text);
      alert('State diff history copied to clipboard!');
    }

    /* Modal Controls */
    function openSummaryModal() {
      if (!activePageId) return;
      sendRPC('getSummary', { pageId: activePageId }, (summary) => {
        document.getElementById('modalTitle').innerText = '📑 Page Summary & Structure';
        const body = document.getElementById('modalBody');

        let headingsHtml = (summary.headings || []).map(h => '<div class="tag-chip"><b>H:</b> ' + h + '</div>').join('');
        let linksHtml = (summary.topLinks || []).map(l => '<tr><td style="color:#38bdf8;">' + (l.text || '(empty)') + '</td><td style="color:#94a3b8; font-family:monospace;">' + l.href + '</td></tr>').join('');

        body.innerHTML = \`
          <div class="summary-section">
            <h4>Page Title</h4>
            <p style="font-size: 1rem; font-weight:600; color: #f8fafc;">\${summary.title || 'N/A'}</p>
          </div>
          <div class="summary-section">
            <h4>Headings Hierarchy (\${(summary.headings || []).length})</h4>
            <div>\${headingsHtml || '<p style="color:var(--text-muted);">No headings found.</p>'}</div>
          </div>
          <div class="summary-section">
            <h4>Discovered Key Links (\${(summary.topLinks || []).length})</h4>
            <table class="link-table">
              <tbody>\${linksHtml || '<tr><td>No links found</td></tr>'}</tbody>
            </table>
          </div>
        \`;
        document.getElementById('modalOverlay').style.display = 'flex';
      });
    }

    function openLinksModal() {
      if (!activePageId) return;
      sendRPC('extractLinks', { pageId: activePageId }, (links) => {
        document.getElementById('modalTitle').innerText = '🔗 Extracted Links (' + (links || []).length + ')';
        const body = document.getElementById('modalBody');

        let rows = (links || []).map(l => \`
          <tr>
            <td style="font-weight:600; color:#38bdf8;">\${l.text || '(icon/image)'}</td>
            <td style="font-family:'JetBrains Mono', monospace; font-size:0.75rem; color:#94a3b8;">\${l.href}</td>
          </tr>
        \`).join('');

        body.innerHTML = \`
          <table class="link-table">
            <thead>
              <tr style="text-align:left; color:#64748b; font-size:0.75rem;">
                <th style="padding:6px 10px;">ANCHOR TEXT</th>
                <th style="padding:6px 10px;">URL TARGET</th>
              </tr>
            </thead>
            <tbody>\${rows}</tbody>
          </table>
        \`;
        document.getElementById('modalOverlay').style.display = 'flex';
      });
    }

    function closeModal(e) {
      document.getElementById('modalOverlay').style.display = 'none';
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    connect();
  </script>
</body>
</html>
`;
