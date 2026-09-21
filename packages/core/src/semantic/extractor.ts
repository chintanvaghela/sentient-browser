import { SemanticNode, SemanticRole, SemanticSnapshot, BoundingBox } from './types.js';
import { generateStableId } from './stable_id.js';

export interface ExtractorOptions {
  includeNonInteractive?: boolean;
  maxTextLength?: number;
  viewportOnly?: boolean;
}

/**
 * Maps HTML tag, attributes, and ARIA role to our canonical SemanticRole.
 */
export function determineRole(
  tagName: string,
  typeAttr?: string | null,
  ariaRole?: string | null
): SemanticRole {
  const tag = tagName.toLowerCase();
  const type = typeAttr ? typeAttr.toLowerCase() : '';

  // 1. Explicit ARIA role
  if (ariaRole) {
    const role = ariaRole.toLowerCase();
    if (['button', 'link', 'checkbox', 'radio', 'heading', 'dialog', 'form'].includes(role)) {
      return role as SemanticRole;
    }
    if (role === 'textbox' || role === 'searchbox') {
      return 'textbox';
    }
    if (role === 'combobox' || role === 'listbox') {
      return 'select';
    }
  }

  // 2. HTML Tag mappings
  switch (tag) {
    case 'button':
      return 'button';
    case 'a':
      return 'link';
    case 'input':
      if (['submit', 'button', 'reset'].includes(type)) return 'button';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'password') return 'password';
      return 'textbox';
    case 'textarea':
      return 'textbox';
    case 'select':
      return 'select';
    case 'option':
      return 'option';
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return 'heading';
    case 'dialog':
      return 'dialog';
    case 'form':
      return 'form';
    case 'table':
      return 'table';
    case 'tr':
      return 'row';
    case 'th':
    case 'td':
      return 'cell';
    case 'ul':
    case 'ol':
      return 'list';
    case 'li':
      return 'listitem';
    case 'nav':
      return 'navigation';
    case 'img':
      return 'image';
    default:
      return 'generic';
  }
}

/**
 * In-browser extraction script string that runs inside Chromium's isolated world.
 * This extracts the pruned Semantic DOM without loading heavy external libraries into the page.
 */
export const IN_PAGE_EXTRACTOR_SCRIPT = `
(() => {
  const IGNORED_TAGS = new Set([
    'script', 'style', 'noscript', 'template', 'link', 'meta',
    'svg', 'path', 'defs', 'clippath', 'g', 'source', 'track'
  ]);

  function isElementVisible(el, style) {
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }
    return true;
  }

  function isElementClickable(el, style) {
    if (style.pointerEvents === 'none') return false;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;

    const tag = el.tagName.toLowerCase();
    if (['button', 'a', 'select', 'textarea'].includes(tag)) return true;
    if (tag === 'input' && el.type !== 'hidden') return true;
    if (el.getAttribute('role') === 'button' || el.getAttribute('role') === 'link') return true;
    if (el.hasAttribute('onclick') || el.hasAttribute('tabindex')) return true;

    return false;
  }

  function cleanText(text) {
    if (!text) return '';
    return text.replace(/\\s+/g, ' ').trim();
  }

  function extractNode(el, idCounts, parentSlug) {
    const tag = el.tagName.toLowerCase();
    if (IGNORED_TAGS.has(tag)) return null;

    const style = window.getComputedStyle(el);
    const visible = isElementVisible(el, style);
    if (!visible) return null;

    const clickable = isElementClickable(el, style);
    const roleAttr = el.getAttribute('role');
    const typeAttr = el.getAttribute('type');
    const ariaLabel = el.getAttribute('aria-label');
    const testId = el.getAttribute('data-testid') || el.getAttribute('data-qa') || el.getAttribute('data-cy');
    const placeholder = el.getAttribute('placeholder');

    // Get direct meaningful text or value
    let directText = '';
    if (tag === 'input' || tag === 'textarea') {
      directText = el.value || '';
    } else if (tag === 'select') {
      directText = el.options[el.selectedIndex]?.text || '';
    } else if (['form', 'dialog', 'main', 'nav', 'body', 'table', 'tbody', 'thead'].includes(tag) && el.children.length > 0) {
      directText = '';
    } else {
      directText = cleanText(el.innerText || el.textContent);
    }

    const isInteractive = clickable || ['input', 'select', 'textarea', 'button', 'a', 'form', 'dialog'].includes(tag);
    const isHeading = /^h[1-6]$/.test(tag);
    const isMeaningfulText = !isInteractive && directText.length > 0 && directText.length < 200 && el.children.length === 0;

    // Prune layout-only containers unless they are forms, dialogs, or interactive
    if (!isInteractive && !isHeading && !isMeaningfulText && !['form', 'dialog', 'main', 'nav'].includes(tag)) {
      return null;
    }

    const rect = el.getBoundingClientRect();
    const bbox = {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };

    // Determine role
    let role = 'generic';
    if (tag === 'button' || (roleAttr === 'button') || (tag === 'input' && ['submit', 'button'].includes(typeAttr))) {
      role = 'button';
    } else if (tag === 'a' || roleAttr === 'link') {
      role = 'link';
    } else if (tag === 'input') {
      if (typeAttr === 'checkbox') role = 'checkbox';
      else if (typeAttr === 'radio') role = 'radio';
      else if (typeAttr === 'password') role = 'password';
      else role = 'textbox';
    } else if (tag === 'textarea') {
      role = 'textbox';
    } else if (tag === 'select') {
      role = 'select';
    } else if (isHeading) {
      role = 'heading';
    } else if (tag === 'form') {
      role = 'form';
    } else if (tag === 'dialog' || roleAttr === 'dialog') {
      role = 'dialog';
    } else if (isMeaningfulText) {
      role = 'text';
    }

    // Generate stable ID slug
    const labelCandidate = ariaLabel || testId || placeholder || directText || role;
    let slug = labelCandidate.toLowerCase().replace(/[^\\w\\s-]/g, '').trim().replace(/[\\s_-]+/g, '_').slice(0, 28);
    if (!slug.endsWith(role)) {
      slug = slug ? slug + '_' + role : role;
    }

    const count = (idCounts[slug] || 0) + 1;
    idCounts[slug] = count;
    const stableId = count > 1 ? slug + '_' + count : slug;

    // Store stable ID on element for quick lookup by Intent Engine
    el.setAttribute('data-sentient-id', stableId);

    return {
      id: stableId,
      role: role,
      text: directText.slice(0, 150),
      tag: tag,
      value: (tag === 'input' || tag === 'textarea') ? el.value : undefined,
      placeholder: placeholder || undefined,
      visible: true,
      enabled: !el.disabled,
      clickable: clickable,
      focused: document.activeElement === el,
      checked: (typeAttr === 'checkbox' || typeAttr === 'radio') ? el.checked : undefined,
      bbox: bbox,
      parentId: parentSlug
    };
  }

  function traverse(root) {
    const nodes = [];
    const idCounts = {};
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

    let current = walker.currentNode;
    while (current) {
      const node = extractNode(current, idCounts, undefined);
      if (node) {
        nodes.push(node);
      }
      current = walker.nextNode();
    }

    return {
      url: window.location.href,
      title: document.title,
      timestamp: Date.now(),
      nodes: nodes,
      totalNodes: nodes.length,
      interactiveCount: nodes.filter(n => n.clickable).length
    };
  }

  return traverse(document.body || document.documentElement);
})()
`;
