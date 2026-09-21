import type { CDPSession, Page } from 'playwright-core';
import { WaitEngine } from '../wait/engine.js';
import { ClickOptions, FillOptions, ScrollOptions } from './types.js';
import { IN_PAGE_EXTRACTOR_SCRIPT } from '../semantic/extractor.js';

export class TargetNotFoundError extends Error {
  constructor(target: string) {
    super(`Target element not found: "${target}"`);
    this.name = 'TargetNotFoundError';
  }
}

export class ElementNotInteractableError extends Error {
  constructor(target: string, reason: string) {
    super(`Target element "${target}" is not interactable: ${reason}`);
    this.name = 'ElementNotInteractableError';
  }
}

export class IntentEngine {
  constructor(
    private page: Page,
    private cdp: CDPSession,
    private waitEngine: WaitEngine
  ) {}

  private async queryTarget(target: string): Promise<any> {
    return this.page.evaluate(async (tgt) => {
      const finder = (window as any).__sentient_find_target;
      const el = finder ? finder(tgt) : null;
      if (!el) return { found: false };

      // Bug 1 fix: Check if the element is inside a position: fixed ancestor
      const isInsideFixed = (() => {
        let curr: Element | null = el;
        while (curr && curr !== document.body && curr !== document.documentElement) {
          try {
            if (window.getComputedStyle(curr).position === 'fixed') return true;
          } catch (_) {}
          curr = curr.parentElement;
        }
        return false;
      })();

      if (!isInsideFixed) {
        el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        // Bug 2 fix: Allow browser to commit scroll position and repaint layout
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      } else {
        // Even for fixed elements, allow layout commit before measuring
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
      }

      const style = window.getComputedStyle(el);
      const visible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      const rect = el.getBoundingClientRect();

      return {
        found: true,
        visible: visible,
        enabled: !el.disabled,
        bbox: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      };
    }, target);
  }

  /**
   * Resolves target element, scrolls into view if needed, and returns bounding box.
   */
  private async resolveTarget(target: string, timeoutMs: number = 2500): Promise<{ x: number; y: number; width: number; height: number }> {
    let res = await this.queryTarget(target);

    // Self-healing: if target not found immediately, re-run extractor to re-stamp data-sentient-id attributes
    if (!res.found) {
      await this.page.evaluate(IN_PAGE_EXTRACTOR_SCRIPT).catch(() => {});
      res = await this.queryTarget(target);
    }

    // Modal/portal animation tolerance: wait for transition/opening animation if element is zero-dimensioned
    const startTime = Date.now();
    while (
      res.found &&
      (!res.visible || res.bbox.width === 0 || res.bbox.height === 0) &&
      Date.now() - startTime < timeoutMs
    ) {
      await new Promise((r) => setTimeout(r, 50));
      res = await this.queryTarget(target);
    }

    if (!res.found) {
      throw new TargetNotFoundError(target);
    }
    if (!res.visible || res.bbox.width === 0 || res.bbox.height === 0) {
      throw new ElementNotInteractableError(target, 'element is hidden or zero-dimensioned');
    }
    if (!res.enabled) {
      throw new ElementNotInteractableError(target, 'element is disabled');
    }

    return res.bbox;
  }

  /**
   * Dispatches native CDP mouse click at target coordinates.
   */
  async click(target: string, options: ClickOptions = {}): Promise<void> {
    const bbox = await this.resolveTarget(target);
    const clickCount = options.clickCount || 1;
    const button = options.button || 'left';

    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    // 1. Move mouse to target
    await this.cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: centerX,
      y: centerY
    });

    // 2. Press mouse button
    await this.cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: centerX,
      y: centerY,
      button: button,
      clickCount: clickCount
    });

    // 3. Release mouse button
    await this.cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: centerX,
      y: centerY,
      button: button,
      clickCount: clickCount
    });

    // Automatically wait for settlement post-click
    await this.waitEngine.waitForSettlement({ profile: options.waitProfile || 'default' });
  }

  /**
   * Fills an input/textarea element with text.
   */
  async fill(target: string, text: string, options: FillOptions = {}): Promise<void> {
    await this.click(target, { waitProfile: options.waitProfile || 'eager' });

    // Clear existing text if requested
    if (options.clearFirst !== false) {
      await this.page.evaluate((tgt) => {
        const el = (window as any).__sentient_find_target(tgt);
        if (el && 'value' in el) {
          el.value = '';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, target);
    }

    // Insert text via native CDP
    await this.cdp.send('Input.insertText', { text: text });

    // Double RAF flush for React/Vue component state update
    await this.page.evaluate(() => {
      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    }).catch(() => {});

    if (options.pressEnterAfter) {
      await this.cdp.send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'Enter',
        code: 'Enter',
        windowsVirtualKeyCode: 13
      });
      await this.cdp.send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'Enter',
        code: 'Enter',
        windowsVirtualKeyCode: 13
      });
    }

    // Automatically wait for settlement post-fill
    await this.waitEngine.waitForSettlement();
  }

  /**
   * Hovers mouse over element.
   */
  async hover(target: string): Promise<void> {
    const bbox = await this.resolveTarget(target);
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    await this.cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: centerX,
      y: centerY
    });

    await this.waitEngine.waitForSettlement({ profile: 'eager' });
  }

  /**
   * Scrolls the page in a given direction or to a specific element.
   */
  async scroll(options: ScrollOptions): Promise<void> {
    if (options.target) {
      await this.resolveTarget(options.target);
    } else {
      const direction = options.direction || 'down';
      const amount = options.amountPx || 500;

      await this.page.evaluate(({ dir, amt }) => {
        let deltaY = 0;
        if (dir === 'down') deltaY = amt;
        else if (dir === 'up') deltaY = -amt;
        else if (dir === 'top') {
          window.scrollTo({ top: 0, behavior: 'instant' });
          return;
        } else if (dir === 'bottom') {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
          return;
        }
        window.scrollBy({ top: deltaY, behavior: 'instant' });
      }, { dir: direction, amt: amount });
    }

    await this.waitEngine.waitForSettlement({ profile: 'eager' });
  }
}
