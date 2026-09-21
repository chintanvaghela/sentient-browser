import { describe, it, expect } from 'vitest';
import { computeStateDiff, formatCompactDiff } from '../src/diff/engine.js';
import { SemanticSnapshot } from '../src/semantic/types.js';

describe('State Diff Engine', () => {
  it('detects added nodes', () => {
    const prev: SemanticSnapshot = {
      url: 'https://example.com',
      title: 'Store',
      timestamp: 100,
      totalNodes: 1,
      interactiveCount: 1,
      nodes: [
        {
          id: 'cart_button',
          role: 'button',
          text: 'Cart (0)',
          tag: 'button',
          visible: true,
          enabled: true,
          clickable: true,
          focused: false,
          bbox: { x: 10, y: 10, width: 50, height: 30 }
        }
      ]
    };

    const curr: SemanticSnapshot = {
      url: 'https://example.com',
      title: 'Store',
      timestamp: 200,
      totalNodes: 2,
      interactiveCount: 2,
      nodes: [
        {
          id: 'cart_button',
          role: 'button',
          text: 'Cart (1)',
          tag: 'button',
          visible: true,
          enabled: true,
          clickable: true,
          focused: false,
          bbox: { x: 10, y: 10, width: 50, height: 30 }
        },
        {
          id: 'checkout_modal',
          role: 'dialog',
          text: 'Item Added to Cart',
          tag: 'dialog',
          visible: true,
          enabled: true,
          clickable: true,
          focused: false,
          bbox: { x: 50, y: 50, width: 200, height: 150 }
        }
      ]
    };

    const diff = computeStateDiff(prev, curr);
    expect(diff.operationsCount).toBe(2);

    const added = diff.deltas.find((d) => d.operation === 'NODE_ADDED');
    expect(added).toBeDefined();
    expect(added?.nodeId).toBe('checkout_modal');

    const updated = diff.deltas.find((d) => d.operation === 'NODE_UPDATED');
    expect(updated).toBeDefined();
    expect(updated?.nodeId).toBe('cart_button');
    expect(updated?.changes?.text).toEqual({ from: 'Cart (0)', to: 'Cart (1)' });

    expect(diff.compact).toContain('+ ADDED:   dialog "checkout_modal"');
    expect(diff.compact).toContain('~ UPDATED: button "cart_button"');
  });

  it('detects removed nodes (e.g. spinner dismissed)', () => {
    const prev: SemanticSnapshot = {
      url: 'https://example.com',
      title: 'Loading',
      timestamp: 100,
      totalNodes: 1,
      interactiveCount: 0,
      nodes: [
        {
          id: 'loading_indicator',
          role: 'text',
          text: 'Loading products...',
          tag: 'div',
          visible: true,
          enabled: true,
          clickable: false,
          focused: false,
          bbox: { x: 10, y: 10, width: 100, height: 20 }
        }
      ]
    };

    const curr: SemanticSnapshot = {
      url: 'https://example.com',
      title: 'Loaded',
      timestamp: 200,
      totalNodes: 0,
      interactiveCount: 0,
      nodes: []
    };

    const diff = computeStateDiff(prev, curr);
    expect(diff.operationsCount).toBe(1);
    expect(diff.deltas[0].operation).toBe('NODE_REMOVED');
    expect(diff.deltas[0].nodeId).toBe('loading_indicator');
    expect(diff.compact).toContain('- REMOVED: text "loading_indicator"');
  });
});
