/**
 * Injected script that runs in the browser page context.
 * Injected via Page.addScriptToEvaluateOnNewDocument.
 * Tracks network in-flight requests, DOM mutations, and provides target element lookups.
 */
export const SENTIENT_INJECTED_SCRIPT = `
(() => {
  if (window.__sentient_initialized) return;
  window.__sentient_initialized = true;

  // 1. Network In-Flight Counter
  window.__sentient_in_flight = 0;
  window.__sentient_last_net_activity = Date.now();

  function isIgnoredNet(url) {
    if (!url || typeof url !== 'string') return false;
    return /clarity\.ms|sentry\.io|google-analytics|cloudflareinsights|doubleclick|googletagmanager|hotjar|segment/i.test(url);
  }

  const originalFetch = window.fetch;
  if (originalFetch) {
    window.fetch = async function(...args) {
      const targetUrl = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
      if (isIgnoredNet(targetUrl)) {
        return originalFetch.apply(this, args);
      }
      window.__sentient_in_flight++;
      window.__sentient_last_net_activity = Date.now();
      try {
        const response = await originalFetch.apply(this, args);
        return response;
      } finally {
        window.__sentient_in_flight = Math.max(0, window.__sentient_in_flight - 1);
        window.__sentient_last_net_activity = Date.now();
      }
    };
  }

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  if (originalOpen && originalSend) {
    XMLHttpRequest.prototype.open = function(...args) {
      this.__sentient_url = args[1];
      this.__sentient_tracked = false;
      return originalOpen.apply(this, args);
    };

    XMLHttpRequest.prototype.send = function(...args) {
      if (!this.__sentient_tracked && !isIgnoredNet(this.__sentient_url)) {
        this.__sentient_tracked = true;
        window.__sentient_in_flight++;
        window.__sentient_last_net_activity = Date.now();

        const onFinish = () => {
          if (this.__sentient_tracked) {
            this.__sentient_tracked = false;
            window.__sentient_in_flight = Math.max(0, window.__sentient_in_flight - 1);
            window.__sentient_last_net_activity = Date.now();
          }
        };

        this.addEventListener('load', onFinish, { once: true });
        this.addEventListener('error', onFinish, { once: true });
        this.addEventListener('abort', onFinish, { once: true });
        this.addEventListener('timeout', onFinish, { once: true });
      }
      return originalSend.apply(this, args);
    };
  }

  // 2. DOM Mutation Tracker
  window.__sentient_last_mutation = Date.now();
  window.__sentient_mutation_count = 0;

  const observer = new MutationObserver(() => {
    window.__sentient_last_mutation = Date.now();
    window.__sentient_mutation_count++;
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });
    }, { once: true });
  }

  // 3. Settlement Status Helper
  window.__sentient_get_settlement = function() {
    const now = Date.now();
    const timeSinceMutation = now - window.__sentient_last_mutation;
    const timeSinceNet = now - window.__sentient_last_net_activity;

    let activeAnimations = 0;
    try {
      if (document.getAnimations) {
        activeAnimations = document.getAnimations().filter(a => {
          return a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations !== Infinity;
        }).length;
      }
    } catch (_) {}

    return {
      inFlightRequests: window.__sentient_in_flight,
      timeSinceLastMutation: timeSinceMutation,
      timeSinceNetActivity: timeSinceNet,
      activeAnimations: activeAnimations
    };
  };

  // 4. In-Page Inverted Index & Target Resolver (DSA Optimized)
  let cachedIndexVersion = -1;
  let cachedIndex = null;

  function buildInvertedIndex() {
    const exactMap = new Map();
    const slugMap = new Map();
    const candidates = Array.from(document.querySelectorAll('button, a, input, [role="button"], select, textarea, [tabindex]'));

    for (const el of candidates) {
      // 1. data-sentient-id
      const sid = el.getAttribute('data-sentient-id');
      if (sid) {
        exactMap.set(sid.toLowerCase(), el);
        slugMap.set(sid.toLowerCase(), el);
      }

      // 2. id and data-testid
      if (el.id) exactMap.set(el.id.toLowerCase(), el);
      const testId = el.getAttribute('data-testid');
      if (testId) exactMap.set(testId.toLowerCase(), el);

      // 3. text, placeholder, aria-label, name, title
      const texts = [
        el.innerText,
        el.value,
        el.getAttribute('placeholder'),
        el.getAttribute('aria-label'),
        el.getAttribute('name'),
        el.getAttribute('title')
      ];

      for (const t of texts) {
        if (!t) continue;
        const clean = t.toLowerCase().trim();
        if (clean && !exactMap.has(clean)) {
          exactMap.set(clean, el);
        }
        // Normalize slug
        const slug = clean.replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '_');
        if (slug && !slugMap.has(slug)) {
          slugMap.set(slug, el);
        }
      }
    }

    cachedIndexVersion = window.__sentient_mutation_count;
    cachedIndex = { exactMap, slugMap, candidates };
    return cachedIndex;
  }

  window.__sentient_find_target = function(target) {
    if (!target) return null;

    // Fast-Path: Direct CSS selector match (if starts with # or contains specific characters)
    if (target.startsWith('#') || target.startsWith('.') || target.includes('>')) {
      try {
        let el = document.querySelector(target);
        if (el) return el;
      } catch (_) {}
    }

    // Check or rebuild cached Inverted Index if mutations occurred
    if (cachedIndexVersion !== window.__sentient_mutation_count || !cachedIndex) {
      buildInvertedIndex();
    }

    const cleanTarget = target.toLowerCase().trim();

    // 1. Exact O(1) hash lookup in Inverted Index
    let el = cachedIndex.exactMap.get(cleanTarget);
    if (el) return el;

    // 2. Normalized Slug O(1) hash lookup
    const normalizedSlug = cleanTarget.replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '_');
    if (normalizedSlug) {
      el = cachedIndex.slugMap.get(normalizedSlug);
      if (el) return el;
    }

    // 3. De-slugged lookup
    const deSlugged = cleanTarget.replace(/_(button|link|textbox|heading|dialog|select)$/, '').replace(/_/g, ' ').trim();
    if (deSlugged && deSlugged !== cleanTarget) {
      el = cachedIndex.exactMap.get(deSlugged) || cachedIndex.slugMap.get(deSlugged);
      if (el) return el;
    }

    // 4. Fallback CSS selector
    try {
      el = document.querySelector(target);
      if (el) return el;
    } catch (_) {}

    // 5. Linear contains fallback over candidate list
    for (const cand of cachedIndex.candidates) {
      const text = (cand.innerText || cand.value || cand.getAttribute('placeholder') || cand.getAttribute('aria-label') || '').toLowerCase();
      if (text.includes(cleanTarget)) return cand;
    }

    return null;
  };
})();
`;
