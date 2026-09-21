import { SemanticNode, SemanticSnapshot } from '../semantic/types.js';
import { NodeDelta, PropertyChange, StateDiff } from './types.js';
import { computeNodeFingerprint } from './merkle.js';

let diffCounter = 0;

/**
 * Computes atomic difference between previous semantic snapshot and current snapshot.
 * Utilizes 32-bit FNV-1a node fingerprinting to bypass property comparisons in O(1) time.
 */
export function computeStateDiff(
  previous: SemanticSnapshot | null,
  current: SemanticSnapshot
): StateDiff {
  const deltas: NodeDelta[] = [];
  const prevMap = new Map<string, SemanticNode>();
  const prevFingerprints = new Map<string, number>();

  if (previous) {
    for (const node of previous.nodes) {
      prevMap.set(node.id, node);
      prevFingerprints.set(node.id, node.fingerprint ?? computeNodeFingerprint(node));
    }
  }

  const currMap = new Map<string, SemanticNode>();
  for (const node of current.nodes) {
    currMap.set(node.id, node);

    const prevNode = prevMap.get(node.id);
    if (!prevNode) {
      // Node was added
      deltas.push({
        operation: 'NODE_ADDED',
        nodeId: node.id,
        role: node.role,
        text: node.text,
        node: node
      });
    } else {
      // Fast-path: O(1) integer fingerprint comparison
      const prevFp = prevFingerprints.get(node.id);
      const currFp = node.fingerprint ?? computeNodeFingerprint(node);

      if (prevFp === currFp) {
        // Node is identical, skip detailed property diffing
        continue;
      }

      // Check for property changes
      const changes: Record<string, PropertyChange> = {};

      if (prevNode.text !== node.text) {
        changes.text = { from: prevNode.text, to: node.text };
      }
      if (prevNode.value !== node.value) {
        changes.value = { from: prevNode.value, to: node.value };
      }
      if (prevNode.enabled !== node.enabled) {
        changes.enabled = { from: prevNode.enabled, to: node.enabled };
      }
      if (prevNode.clickable !== node.clickable) {
        changes.clickable = { from: prevNode.clickable, to: node.clickable };
      }
      if (prevNode.visible !== node.visible) {
        changes.visible = { from: prevNode.visible, to: node.visible };
      }
      if (prevNode.focused !== node.focused) {
        changes.focused = { from: prevNode.focused, to: node.focused };
      }
      if (prevNode.checked !== node.checked) {
        changes.checked = { from: prevNode.checked, to: node.checked };
      }

      if (Object.keys(changes).length > 0) {
        deltas.push({
          operation: 'NODE_UPDATED',
          nodeId: node.id,
          role: node.role,
          changes: changes
        });
      }
    }
  }

  // Check for removed nodes
  if (previous) {
    for (const [prevId, prevNode] of prevMap.entries()) {
      if (!currMap.has(prevId)) {
        deltas.push({
          operation: 'NODE_REMOVED',
          nodeId: prevId,
          role: prevNode.role,
          text: prevNode.text
        });
      }
    }
  }

  const compact = formatCompactDiff(deltas);
  diffCounter++;

  return {
    id: `diff_${Date.now()}_${diffCounter}`,
    timestamp: Date.now(),
    url: current.url,
    title: current.title,
    operationsCount: deltas.length,
    deltas: deltas,
    compact: compact
  };
}

/**
 * Formats deltas into a token-efficient, human-readable string for AI models.
 */
export function formatCompactDiff(deltas: NodeDelta[]): string {
  if (deltas.length === 0) {
    return '[STATE DIFF] No semantic changes detected.';
  }

  const lines: string[] = ['[STATE DIFF]'];

  for (const delta of deltas) {
    switch (delta.operation) {
      case 'NODE_ADDED': {
        const flags = [];
        if (delta.node?.clickable) flags.push('clickable');
        if (delta.node?.enabled) flags.push('enabled');
        const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
        const textStr = delta.text ? ` "${delta.text}"` : '';
        lines.push(`+ ADDED:   ${delta.role} "${delta.nodeId}"${textStr}${flagStr}`);
        break;
      }
      case 'NODE_REMOVED': {
        const textStr = delta.text ? ` ("${delta.text}")` : '';
        lines.push(`- REMOVED: ${delta.role} "${delta.nodeId}"${textStr}`);
        break;
      }
      case 'NODE_UPDATED': {
        if (delta.changes) {
          const changeList = Object.entries(delta.changes)
            .map(([k, v]) => `${k}: ${JSON.stringify(v.from)} -> ${JSON.stringify(v.to)}`)
            .join(', ');
          lines.push(`~ UPDATED: ${delta.role} "${delta.nodeId}" [${changeList}]`);
        }
        break;
      }
    }
  }

  return lines.join('\n');
}
