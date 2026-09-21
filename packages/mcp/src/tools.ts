export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export const SENTIENT_TOOLS: ToolDefinition[] = [
  {
    name: 'sentient_navigate',
    description:
      'Navigate to a URL and wait for deterministic multi-signal settlement (~45ms). Returns page title and top interactive elements in <1000 tokens.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to navigate to (e.g. https://example.com)' },
        timeoutMs: { type: 'number', description: 'Optional timeout in milliseconds (default: 30000)' }
      },
      required: ['url']
    }
  },
  {
    name: 'sentient_act',
    description:
      'Autonomously solve a high-level natural language goal on the current or specified web page. Plans actions, executes native CDP events, tracks state diffs, and returns the final answer in 1 single turn.',
    inputSchema: {
      type: 'object',
      properties: {
        goal: { type: 'string', description: 'The objective to accomplish (e.g. "Find features of Time Tracker", "Check pricing")' },
        url: { type: 'string', description: 'Optional URL to navigate to before planning' },
        maxSteps: { type: 'number', description: 'Maximum action steps allowed (default: 8)' }
      },
      required: ['goal']
    }
  },
  {
    name: 'sentient_click',
    description:
      'Click an interactive element by its deterministic stable ID or visible text. Emits a compact state diff showing only what changed.',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Stable element ID (e.g. "time_tracker_button", "login_btn") or visible text' }
      },
      required: ['target']
    }
  },
  {
    name: 'sentient_fill',
    description:
      'Type text into an input field using native Chrome DevTools Protocol keyboard events. Emits a compact state diff.',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Stable element ID or placeholder (e.g. "email_input")' },
        text: { type: 'string', description: 'The text value to type into the field' }
      },
      required: ['target', 'text']
    }
  },
  {
    name: 'sentient_hover',
    description:
      'Hover over an element by stable ID to reveal dropdowns or tooltips. Emits a compact state diff.',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Stable element ID or visible text to hover over' }
      },
      required: ['target']
    }
  },
  {
    name: 'sentient_scroll',
    description:
      'Scroll the page or container in a direction ("down", "up", "bottom", "top"). Emits state diff.',
    inputSchema: {
      type: 'object',
      properties: {
        direction: {
          type: 'string',
          enum: ['down', 'up', 'bottom', 'top'],
          description: 'Direction to scroll (default: "down")'
        },
        amountPx: { type: 'number', description: 'Pixels to scroll (default: 600)' }
      }
    }
  },
  {
    name: 'sentient_rollback',
    description:
      'Undo the last browser action (restores previous form input values, navigates back, or dismisses dialogs). Self-healing recovery tool.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'sentient_extract',
    description:
      'Extract structured clean data from the page: "summary" (headings & title), "links" (clean URLs), "table" (rows as JSON objects), or "list" (clean items).',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['summary', 'links', 'table', 'list'],
          description: 'Type of structured extraction'
        },
        selector: { type: 'string', description: 'Optional CSS selector for table or list' }
      },
      required: ['type']
    }
  },
  {
    name: 'sentient_snapshot',
    description:
      'Get the full pruned Semantic DOM JSON tree (stripped of 90%+ layout noise, with bounding boxes and interactive flags).',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'sentient_diff',
    description:
      'Get incremental state diff showing DOM additions, removals, attribute updates, and compact summary since the previous action. Highly token-efficient (<100 tokens).',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'sentient_screenshot',
    description:
      'Capture a viewport JPEG screenshot as base64 data for visual inspection.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];
