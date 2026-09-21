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
  window.__sentient_get_settlement = function(options) {
    const scope = (options && options.scope) || 'local';
    const now = Date.now();
    const timeSinceMutation = now - window.__sentient_last_mutation;
    const timeSinceNet = now - window.__sentient_last_net_activity;

    let activeAnimations = 0;
    try {
      if (scope === 'global') {
        // Global scope: inspect all animations and CSS transitions across document.body and React portals
        const anims = document.body && document.body.getAnimations
          ? document.body.getAnimations({ subtree: true })
          : (document.getAnimations ? document.getAnimations() : []);

        activeAnimations = anims.filter(a => {
          const isRunningOrPending = a.playState === 'running' || a.pending;
          if (!isRunningOrPending) return false;
          try {
            const timing = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null;
            return !timing || timing.iterations !== Infinity;
          } catch (_) {
            return true;
          }
        }).length;

        // Also check if any fixed/portal overlay elements have active CSS transitions
        if (activeAnimations === 0) {
          const overlays = document.querySelectorAll('.fixed, [role="dialog"], [aria-modal="true"], [data-state="open"], [class*="modal"]');
          for (const ov of overlays) {
            const cs = window.getComputedStyle(ov);
            const transitionDuration = parseFloat(cs.transitionDuration || '0');
            const animationDuration = parseFloat(cs.animationDuration || '0');
            const maxDurationMs = Math.max(transitionDuration, animationDuration) * 1000;
            if (maxDurationMs > 0 && timeSinceMutation < maxDurationMs + 50) {
              activeAnimations++;
            }
          }
        }
      } else if (document.getAnimations) {
        activeAnimations = document.getAnimations().filter(a => {
          const isRunningOrPending = a.playState === 'running' || a.pending;
          if (!isRunningOrPending) return false;
          try {
            const timing = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null;
            return !timing || timing.iterations !== Infinity;
          } catch (_) {
            return true;
          }
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

  function isVisible(el) {
    if (!el) return false;
    try {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    } catch (_) {
      return false;
    }
  }

  function toSlug(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .replace(/[^a-zA-Z0-9_ -]/g, ' ')
      .trim()
      .replace(/[ _-]+/g, '_');
  }

  function indexSet(map, key, el) {
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, el);
    } else {
      const existing = map.get(key);
      if (!isVisible(existing) && isVisible(el)) {
        map.set(key, el);
      }
    }
  }

  function buildInvertedIndex() {
    const exactMap = new Map();
    const slugMap = new Map();
    const candidates = Array.from(document.querySelectorAll('button, a, input, [role="button"], select, textarea, [tabindex]'));

    for (const el of candidates) {
      // 1. data-sentient-id
      const sid = el.getAttribute('data-sentient-id');
      if (sid) {
        indexSet(exactMap, sid.toLowerCase(), el);
        indexSet(slugMap, sid.toLowerCase(), el);
      }

      // 2. id and data-testid
      if (el.id) indexSet(exactMap, el.id.toLowerCase(), el);
      const testId = el.getAttribute('data-testid');
      if (testId) indexSet(exactMap, testId.toLowerCase(), el);

      // 3. text, placeholder, aria-label, name, title
      const rawTexts = [
        el.innerText,
        el.value,
        el.getAttribute('placeholder'),
        el.getAttribute('aria-label'),
        el.getAttribute('name'),
        el.getAttribute('title')
      ];

      const span = el.querySelector('span');
      if (span && span.innerText) {
        rawTexts.push(span.innerText);
      }

      for (const t of rawTexts) {
        if (!t || typeof t !== 'string') continue;
        const clean = t.toLowerCase().trim();
        if (!clean) continue;

        indexSet(exactMap, clean, el);
        const slug = toSlug(clean);
        if (slug) {
          indexSet(slugMap, slug, el);
        }

        // If multi-line, index each line separately
        const newlineChar = String.fromCharCode(10);
        if (clean.indexOf(newlineChar) !== -1) {
          const lines = clean.split(newlineChar);
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              indexSet(exactMap, trimmedLine, el);
              const lineSlug = toSlug(trimmedLine);
              if (lineSlug) {
                indexSet(slugMap, lineSlug, el);
              }
            }
          }
        }
      }
    }

    cachedIndexVersion = window.__sentient_mutation_count;
    cachedIndex = { exactMap, slugMap, candidates };
    return cachedIndex;
  }

  window.__sentient_find_target = function(target) {
    if (!target) return null;

    // Fast-Path: Direct CSS selector match (if starts with # or . or contains selector characters)
    if (target.startsWith('#') || target.startsWith('.') || target.includes('>') || target.includes('[') || target.includes(':')) {
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
    const targetSlug = toSlug(cleanTarget);
    const deSlugged = cleanTarget.replace(/_(button|link|textbox|heading|dialog|select)$/, '').replace(/_/g, ' ').trim();

    // 1. Exact O(1) hash lookup
    const exactCandidate = cachedIndex.exactMap.get(cleanTarget);
    if (exactCandidate && isVisible(exactCandidate)) return exactCandidate;

    // 2. Normalized Slug O(1) hash lookup
    if (targetSlug) {
      const slugCandidate = cachedIndex.slugMap.get(targetSlug);
      if (slugCandidate && isVisible(slugCandidate)) return slugCandidate;
    }

    // 3. De-slugged lookup
    if (deSlugged && deSlugged !== cleanTarget) {
      const deSlugCandidate = cachedIndex.exactMap.get(deSlugged) || (toSlug(deSlugged) ? cachedIndex.slugMap.get(toSlug(deSlugged)) : null);
      if (deSlugCandidate && isVisible(deSlugCandidate)) return deSlugCandidate;
    }

    // 4. Linear contains check over candidates (strictly visible elements first)
    for (const cand of cachedIndex.candidates) {
      if (!isVisible(cand)) continue;
      const text = (cand.innerText || cand.value || cand.getAttribute('placeholder') || cand.getAttribute('aria-label') || '').toLowerCase();
      if (text.includes(cleanTarget) || (targetSlug && toSlug(text).includes(targetSlug))) {
        return cand;
      }
    }

    // 5. Fallback CSS selector
    try {
      let el = document.querySelector(target);
      if (el && isVisible(el)) return el;
    } catch (_) {}

    // 6. Last resort: return non-visible candidate if any was found
    if (exactCandidate) return exactCandidate;
    if (targetSlug && cachedIndex.slugMap.get(targetSlug)) return cachedIndex.slugMap.get(targetSlug);
    try {
      return document.querySelector(target);
    } catch (_) {}

    return null;
  };
})();
`;
