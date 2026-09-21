import type { SemanticNode, BoundingBox } from './types.js';

export interface SpatialQueryOptions {
  interactiveOnly?: boolean;
}

/**
 * High-performance 2D Spatial Grid Index (Bucket Grid).
 * Divides the 2D viewport coordinate space into a uniform grid of cells (default: 64x64px),
 * enabling O(1) average time point-in-box hit-testing, coordinate querying, and
 * spatial nearest-neighbor search.
 */
export class SpatialGridIndex {
  private cellSize: number;
  private grid: Map<number, SemanticNode[]> = new Map();
  private allNodes: SemanticNode[] = [];

  constructor(cellSize = 64) {
    this.cellSize = cellSize;
  }

  /**
   * Hashes 2D grid coordinate (col, row) into a single 32-bit integer key.
   */
  private cellKey(col: number, row: number): number {
    // 16-bit shift encoding for fast key computation (supports coordinates up to 32768px)
    return ((col & 0xffff) << 16) | (row & 0xffff);
  }

  /**
   * Clears the index and builds grid cells from a semantic node list.
   */
  build(nodes: SemanticNode[]): void {
    this.grid.clear();
    this.allNodes = nodes;

    for (const node of nodes) {
      if (!node.bbox || node.bbox.width === 0 || node.bbox.height === 0) continue;
      this.insert(node);
    }
  }

  /**
   * Inserts a single node into all intersecting grid cells.
   */
  insert(node: SemanticNode): void {
    const { x, y, width, height } = node.bbox;
    const startCol = Math.floor(x / this.cellSize);
    const endCol = Math.floor((x + width) / this.cellSize);
    const startRow = Math.floor(y / this.cellSize);
    const endRow = Math.floor((y + height) / this.cellSize);

    for (let c = startCol; c <= endCol; c++) {
      for (let r = startRow; r <= endRow; r++) {
        const key = this.cellKey(c, r);
        let cell = this.grid.get(key);
        if (!cell) {
          cell = [];
          this.grid.set(key, cell);
        }
        cell.push(node);
      }
    }
  }

  /**
   * Fast O(1) point-in-box hit test.
   * Returns all elements whose bounding boxes contain (x, y).
   * Sorted by area ascending (deepest/smallest target element first).
   */
  queryPoint(x: number, y: number, options: SpatialQueryOptions = {}): SemanticNode[] {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    const key = this.cellKey(col, row);

    const cell = this.grid.get(key);
    if (!cell || cell.length === 0) return [];

    const matches: SemanticNode[] = [];
    for (const node of cell) {
      if (options.interactiveOnly && !node.clickable && node.role !== 'button' && node.role !== 'textbox' && node.role !== 'link') {
        continue;
      }
      const b = node.bbox;
      if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
        matches.push(node);
      }
    }

    // Sort by area ascending so most specific child element is selected first
    if (matches.length > 1) {
      matches.sort((a, b) => a.bbox.width * a.bbox.height - b.bbox.width * b.bbox.height);
    }

    return matches;
  }

  /**
   * Finds the nearest element to point (x, y) within a maximum search radius.
   */
  queryNearest(x: number, y: number, maxRadius = 128, options: SpatialQueryOptions = {}): SemanticNode | null {
    // 1. Direct hit check
    const directHits = this.queryPoint(x, y, options);
    if (directHits.length > 0) {
      return directHits[0];
    }

    // 2. Expanding radial grid cell search
    const centerCol = Math.floor(x / this.cellSize);
    const centerRow = Math.floor(y / this.cellSize);
    const maxCellDist = Math.ceil(maxRadius / this.cellSize);

    let bestNode: SemanticNode | null = null;
    let bestDistSq = maxRadius * maxRadius;

    const checkedNodes = new Set<string>();

    // Check center cell (r = 0)
    this.checkCellNearest(centerCol, centerRow, x, y, options, checkedNodes, (node, distSq) => {
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestNode = node;
      }
    });

    for (let r = 1; r <= maxCellDist; r++) {
      for (let c = -r; c <= r; c++) {
        for (let rowOffset of [-r, r]) {
          this.checkCellNearest(centerCol + c, centerRow + rowOffset, x, y, options, checkedNodes, (node, distSq) => {
            if (distSq < bestDistSq) {
              bestDistSq = distSq;
              bestNode = node;
            }
          });
        }
      }
      for (let row = -r + 1; row <= r - 1; row++) {
        for (let colOffset of [-r, r]) {
          this.checkCellNearest(centerCol + colOffset, centerRow + row, x, y, options, checkedNodes, (node, distSq) => {
            if (distSq < bestDistSq) {
              bestDistSq = distSq;
              bestNode = node;
            }
          });
        }
      }

      // If we found a candidate within current ring, we can stop
      if (bestNode && bestDistSq <= (r * this.cellSize) * (r * this.cellSize)) break;
    }

    return bestNode;
  }

  private checkCellNearest(
    col: number,
    row: number,
    x: number,
    y: number,
    options: SpatialQueryOptions,
    checked: Set<string>,
    onFound: (node: SemanticNode, distSq: number) => void
  ): void {
    const key = this.cellKey(col, row);
    const cell = this.grid.get(key);
    if (!cell) return;

    for (const node of cell) {
      if (checked.has(node.id)) continue;
      checked.add(node.id);

      if (options.interactiveOnly && !node.clickable && node.role !== 'button' && node.role !== 'textbox' && node.role !== 'link') {
        continue;
      }

      // Shortest euclidean distance from point (x, y) to the node's bounding rectangle
      const clampedX = Math.max(node.bbox.x, Math.min(x, node.bbox.x + node.bbox.width));
      const clampedY = Math.max(node.bbox.y, Math.min(y, node.bbox.y + node.bbox.height));
      const dx = x - clampedX;
      const dy = y - clampedY;
      const distSq = dx * dx + dy * dy;

      onFound(node, distSq);
    }
  }

  get totalIndexedNodes(): number {
    return this.allNodes.length;
  }
}
