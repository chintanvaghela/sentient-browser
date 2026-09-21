import type { StateDiff, SemanticSnapshot, SentientPage, NodeDelta } from '@sentient/core';

export interface MatcherResult {
  pass: boolean;
  message: () => string;
}

export type NodeMatcher = string | { role?: string; text?: string | RegExp; id?: string; tag?: string };

interface SimpleNode {
  id?: string;
  role?: string;
  text?: string;
  tag?: string;
}

function matchNode(node: SimpleNode, matcher: NodeMatcher): boolean {
  if (typeof matcher === 'string') {
    const q = matcher.toLowerCase();
    const idMatches = Boolean(node.id && node.id.toLowerCase().includes(q));
    const textMatches = Boolean(node.text && node.text.toLowerCase().includes(q));
    const roleMatches = Boolean(node.role && node.role.toLowerCase() === q);
    return idMatches || textMatches || roleMatches;
  }

  if (matcher.id && node.id !== matcher.id) return false;
  if (matcher.role && node.role !== matcher.role) return false;
  if (matcher.tag && node.tag !== matcher.tag) return false;
  if (matcher.text) {
    if (typeof matcher.text === 'string') {
      if (!node.text || !node.text.toLowerCase().includes(matcher.text.toLowerCase())) return false;
    } else if (matcher.text instanceof RegExp) {
      if (!node.text || !matcher.text.test(node.text)) return false;
    }
  }

  return true;
}

function getAddedNodes(diff: any): SimpleNode[] {
  if (Array.isArray(diff?.added)) return diff.added;
  if (Array.isArray(diff?.deltas)) {
    return diff.deltas
      .filter((d: NodeDelta) => d.operation === 'NODE_ADDED')
      .map((d: NodeDelta) => ({ id: d.nodeId, role: d.role, text: d.text, tag: d.node?.tag }));
  }
  return [];
}

function getRemovedNodes(diff: any): SimpleNode[] {
  if (Array.isArray(diff?.removed)) return diff.removed;
  if (Array.isArray(diff?.deltas)) {
    return diff.deltas
      .filter((d: NodeDelta) => d.operation === 'NODE_REMOVED')
      .map((d: NodeDelta) => ({ id: d.nodeId, role: d.role, text: d.text, tag: d.node?.tag }));
  }
  return [];
}

function getUpdatedNodes(diff: any): SimpleNode[] {
  if (Array.isArray(diff?.updated)) return diff.updated;
  if (Array.isArray(diff?.deltas)) {
    return diff.deltas
      .filter((d: NodeDelta) => d.operation === 'NODE_UPDATED')
      .map((d: NodeDelta) => ({ id: d.nodeId, role: d.role, text: d.text }));
  }
  return [];
}

/**
 * Custom assertions for Sentient Browser testing.
 */
export const sentientMatchers = {
  /**
   * Asserts that a SentientPage has reached deterministic settlement.
   */
  async toSettle(received: SentientPage | any, options: { timeoutMs?: number; profile?: 'eager' | 'default' | 'strict' } = {}): Promise<MatcherResult> {
    try {
      if (typeof received?.waitForSettlement === 'function') {
        await received.waitForSettlement(options);
      } else if (received?.waitEngine && typeof received.waitEngine.waitForSettlement === 'function') {
        await received.waitEngine.waitForSettlement(options);
      } else if (typeof received?.evaluate === 'function') {
        await received.evaluate(() => {
          return new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });
        });
      }
      return {
        pass: true,
        message: () => `expected page not to settle, but it settled successfully`
      };
    } catch (err: any) {
      return {
        pass: false,
        message: () => `expected page to settle, but settlement failed: ${err.message}`
      };
    }
  },

  /**
   * Asserts that a StateDiff contains an added node matching the criteria.
   */
  toHaveAdded(received: StateDiff | any, matcher: NodeMatcher): MatcherResult {
    const added: SimpleNode[] = getAddedNodes(received);
    const matched = added.some((node: SimpleNode) => matchNode(node, matcher));

    return {
      pass: matched,
      message: () =>
        matched
          ? `expected StateDiff not to have added node matching ${JSON.stringify(matcher)}, but found matching node`
          : `expected StateDiff to have added node matching ${JSON.stringify(matcher)}, but added nodes were: [${added.map((n: SimpleNode) => n.id || n.text).join(', ')}]`
    };
  },

  /**
   * Asserts that a StateDiff contains a removed node matching the criteria.
   */
  toHaveRemoved(received: StateDiff | any, matcher: NodeMatcher): MatcherResult {
    const removed: SimpleNode[] = getRemovedNodes(received);
    const matched = removed.some((node: SimpleNode) => matchNode(node, matcher));

    return {
      pass: matched,
      message: () =>
        matched
          ? `expected StateDiff not to have removed node matching ${JSON.stringify(matcher)}, but found matching node`
          : `expected StateDiff to have removed node matching ${JSON.stringify(matcher)}, but removed nodes were: [${removed.map((n: SimpleNode) => n.id || n.text).join(', ')}]`
    };
  },

  /**
   * Asserts that a StateDiff contains an updated node delta for target ID.
   */
  toHaveUpdated(received: StateDiff | any, targetId: string): MatcherResult {
    const updated: SimpleNode[] = getUpdatedNodes(received);
    const matched = updated.some((delta: SimpleNode) => delta.id === targetId || Boolean(delta.text?.includes(targetId)));

    return {
      pass: matched,
      message: () =>
        matched
          ? `expected StateDiff not to have updated node "${targetId}", but found delta`
          : `expected StateDiff to have updated node "${targetId}", but updated nodes were: [${updated.map((d: SimpleNode) => d.id).join(', ')}]`
    };
  },

  /**
   * Asserts that a page or snapshot contains specific semantic text.
   */
  async toHaveSemanticText(received: SentientPage | SemanticSnapshot | any, expectedText: string | RegExp): Promise<MatcherResult> {
    let snapshot: SemanticSnapshot;
    if (typeof received?.getSemanticDOM === 'function') {
      snapshot = await received.getSemanticDOM();
    } else if (Array.isArray(received?.nodes)) {
      snapshot = received;
    } else {
      throw new Error('toHaveSemanticText requires a SentientPage or SemanticSnapshot');
    }

    const matched = snapshot.nodes.some((node) => {
      if (!node.text) return false;
      if (typeof expectedText === 'string') {
        return node.text.toLowerCase().includes(expectedText.toLowerCase());
      }
      return expectedText.test(node.text);
    });

    return {
      pass: matched,
      message: () =>
        matched
          ? `expected page not to contain semantic text "${expectedText}", but found match`
          : `expected page to contain semantic text "${expectedText}", but text was not found in semantic tree`
    };
  }
};
