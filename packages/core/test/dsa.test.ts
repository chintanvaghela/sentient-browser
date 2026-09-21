import { describe, it, expect } from 'vitest';
import {
  computeNodeFingerprint,
  buildMerkleTree,
  fnv1a32
} from '../src/diff/merkle.js';
import { SpatialGridIndex } from '../src/semantic/spatial.js';
import { MaxHeap, extractTopK } from '../src/agent/heap.js';
import type { SemanticNode } from '../src/semantic/types.js';

describe('Data Structures & Algorithms (DSA) Optimizations', () => {
  describe('FNV-1a Fingerprinting & Merkle Subtree Hashing', () => {
    const baseNode: SemanticNode = {
      id: 'button_submit',
      role: 'button',
      tag: 'button',
      text: 'Submit Application',
      clickable: true,
      visible: true,
      enabled: true,
      bbox: { x: 100, y: 200, width: 120, height: 40 }
    };

    it('generates consistent 32-bit unsigned integer fingerprints', () => {
      const fp1 = computeNodeFingerprint(baseNode);
      const fp2 = computeNodeFingerprint({ ...baseNode });

      expect(typeof fp1).toBe('number');
      expect(fp1).toBeGreaterThan(0);
      expect(fp1).toBe(fp2);
    });

    it('detects single-bit boolean and text property mutations in O(1)', () => {
      const originalFp = computeNodeFingerprint(baseNode);

      const changedTextFp = computeNodeFingerprint({ ...baseNode, text: 'Processing...' });
      expect(changedTextFp).not.toBe(originalFp);

      const disabledFp = computeNodeFingerprint({ ...baseNode, enabled: false });
      expect(disabledFp).not.toBe(originalFp);

      const notClickableFp = computeNodeFingerprint({ ...baseNode, clickable: false });
      expect(notClickableFp).not.toBe(originalFp);
    });

    it('builds Merkle tree and propagates child mutations to parent subtree hash', () => {
      const parent: SemanticNode = {
        id: 'card_container',
        role: 'dialog',
        tag: 'div',
        text: '',
        clickable: false,
        visible: true,
        bbox: { x: 50, y: 50, width: 400, height: 300 }
      };

      const child1: SemanticNode = {
        id: 'title_heading',
        role: 'heading',
        tag: 'h2',
        text: 'Confirmation Dialog',
        parentId: 'card_container',
        clickable: false,
        visible: true,
        bbox: { x: 60, y: 60, width: 200, height: 30 }
      };

      const child2: SemanticNode = {
        ...baseNode,
        parentId: 'card_container'
      };

      const tree1 = buildMerkleTree([parent, child1, child2]);
      const initialParentSubtreeHash = tree1.subtreeHashes.get('card_container');
      expect(initialParentSubtreeHash).toBeDefined();

      // Mutate child2
      const mutatedChild2: SemanticNode = {
        ...child2,
        text: 'Submitting...'
      };

      const tree2 = buildMerkleTree([parent, child1, mutatedChild2]);
      const updatedParentSubtreeHash = tree2.subtreeHashes.get('card_container');

      // Parent's subtree hash must change when any descendant mutates
      expect(updatedParentSubtreeHash).not.toBe(initialParentSubtreeHash);
      // Unmutated child1's fingerprint remains identical
      expect(tree2.nodeFingerprints.get('title_heading')).toBe(tree1.nodeFingerprints.get('title_heading'));
    });
  });

  describe('2D Spatial Grid Index', () => {
    const grid = new SpatialGridIndex(64);

    const btn1: SemanticNode = {
      id: 'login_btn',
      role: 'button',
      tag: 'button',
      text: 'Log In',
      clickable: true,
      visible: true,
      bbox: { x: 100, y: 100, width: 80, height: 30 }
    };

    const btn2: SemanticNode = {
      id: 'cancel_btn',
      role: 'button',
      tag: 'button',
      text: 'Cancel',
      clickable: true,
      visible: true,
      bbox: { x: 190, y: 100, width: 80, height: 30 }
    };

    const container: SemanticNode = {
      id: 'modal_wrapper',
      role: 'dialog',
      tag: 'div',
      text: '',
      clickable: false,
      visible: true,
      bbox: { x: 80, y: 80, width: 400, height: 200 }
    };

    grid.build([container, btn1, btn2]);

    it('performs O(1) point-in-box hit-testing prioritizing deepest element', () => {
      // Point inside login button (x: 120, y: 110)
      const hits = grid.queryPoint(120, 110);
      expect(hits.length).toBe(2); // btn1 and container
      expect(hits[0].id).toBe('login_btn'); // smaller area first

      // Point outside buttons but inside container
      const containerHits = grid.queryPoint(90, 90);
      expect(containerHits.length).toBe(1);
      expect(containerHits[0].id).toBe('modal_wrapper');

      // Point outside everything
      const miss = grid.queryPoint(600, 600);
      expect(miss).toHaveLength(0);
    });

    it('finds nearest interactive element in O(1) cell radius', () => {
      // Point at (90, 105) is 10px away from login_btn
      const nearest = grid.queryNearest(90, 105, 50, { interactiveOnly: true });
      expect(nearest).toBeDefined();
      expect(nearest?.id).toBe('login_btn');
    });
  });

  describe('Binary Max-Heap & Top-K Algorithm', () => {
    it('maintains max-heap invariant with O(1) peek and O(log N) pop', () => {
      const heap = new MaxHeap<string>();
      heap.push('low', 1);
      heap.push('high', 10);
      heap.push('medium', 5);
      heap.push('highest', 20);

      expect(heap.size).toBe(4);
      expect(heap.peek()?.item).toBe('highest');

      expect(heap.pop()?.item).toBe('highest');
      expect(heap.pop()?.item).toBe('high');
      expect(heap.pop()?.item).toBe('medium');
      expect(heap.pop()?.item).toBe('low');
      expect(heap.isEmpty()).toBe(true);
    });

    it('extracts top-K items in O(N log K) without full array sort', () => {
      const items = [
        { name: 'itemA', score: 10 },
        { name: 'itemB', score: 95 },
        { name: 'itemC', score: 40 },
        { name: 'itemD', score: 80 },
        { name: 'itemE', score: 25 },
        { name: 'itemF', score: 65 }
      ];

      const top2 = extractTopK(items, 2, (x) => x.score);
      expect(top2).toHaveLength(2);
      expect(top2[0].item.name).toBe('itemB');
      expect(top2[0].score).toBe(95);
      expect(top2[1].item.name).toBe('itemD');
      expect(top2[1].score).toBe(80);
    });
  });
});
