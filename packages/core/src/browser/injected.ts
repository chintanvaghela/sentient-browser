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

  const originalFetch = window.fetch;
  if (originalFetch) {
    window.fetch = async function(...args) {
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
      this.__sentient_tracked = false;
      return originalOpen.apply(this, args);
    };

    XMLHttpRequest.prototype.send = function(...args) {
      if (!this.__sentient_tracked) {
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

  // 4. Target Element Resolver
  window.__sentient_find_target = function(target) {
    // A. Direct data-sentient-id match
    let el = document.querySelector('[data-sentient-id="' + CSS.escape(target) + '"]');
    if (el) return el;

    // B. data-testid or id match
    el = document.querySelector('[data-testid="' + CSS.escape(target) + '"]') || document.getElementById(target);
    if (el) return el;

    // C. Text match across interactive elements
    const cleanTarget = target.toLowerCase().trim();
    const candidates = Array.from(document.querySelectorAll('button, a, input, [role="button"], select, textarea'));
    
    // Exact text match
    for (const cand of candidates) {
      const text = (cand.innerText || cand.value || cand.getAttribute('aria-label') || '').toLowerCase().trim();
      if (text === cleanTarget) return cand;
    }

    // Contains text match
    for (const cand of candidates) {
      const text = (cand.innerText || cand.value || cand.getAttribute('aria-label') || '').toLowerCase().trim();
      if (text.includes(cleanTarget)) return cand;
    }

    // D. De-slugged match (e.g. "time_tracker_button" -> "time tracker")
    const deSlugged = cleanTarget.replace(/_(button|link|textbox|heading|dialog|select)$/, '').replace(/_/g, ' ').trim();
    if (deSlugged && deSlugged !== cleanTarget) {
      for (const cand of candidates) {
        const text = (cand.innerText || cand.value || cand.getAttribute('aria-label') || '').toLowerCase().trim();
        if (text === deSlugged || text.includes(deSlugged)) return cand;
      }
    }

    return null;
  };
})();
`;
