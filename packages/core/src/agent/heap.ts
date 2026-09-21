export interface HeapEntry<T> {
  item: T;
  priority: number;
}

/**
 * High-performance Binary Max-Heap Priority Queue.
 * Enables O(1) peek and O(log N) push/pop for candidate action scoring.
 */
export class MaxHeap<T> {
  private data: HeapEntry<T>[] = [];

  constructor(entries?: HeapEntry<T>[]) {
    if (entries && entries.length > 0) {
      this.data = [...entries];
      this.heapify();
    }
  }

  get size(): number {
    return this.data.length;
  }

  isEmpty(): boolean {
    return this.data.length === 0;
  }

  peek(): HeapEntry<T> | undefined {
    return this.data[0];
  }

  push(item: T, priority: number): void {
    this.data.push({ item, priority });
    this.siftUp(this.data.length - 1);
  }

  pop(): HeapEntry<T> | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const bottom = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = bottom;
      this.siftDown(0);
    }
    return top;
  }

  private heapify(): void {
    const lastParent = (this.data.length - 2) >> 1;
    for (let i = lastParent; i >= 0; i--) {
      this.siftDown(i);
    }
  }

  private siftUp(index: number): void {
    let curr = index;
    while (curr > 0) {
      const parent = (curr - 1) >> 1;
      if (this.data[curr].priority > this.data[parent].priority) {
        this.swap(curr, parent);
        curr = parent;
      } else {
        break;
      }
    }
  }

  private siftDown(index: number): void {
    let curr = index;
    const length = this.data.length;

    while ((curr << 1) + 1 < length) {
      let left = (curr << 1) + 1;
      let right = left + 1;
      let largest = curr;

      if (this.data[left].priority > this.data[largest].priority) {
        largest = left;
      }
      if (right < length && this.data[right].priority > this.data[largest].priority) {
        largest = right;
      }

      if (largest !== curr) {
        this.swap(curr, largest);
        curr = largest;
      } else {
        break;
      }
    }
  }

  private swap(i: number, j: number): void {
    const temp = this.data[i];
    this.data[i] = this.data[j];
    this.data[j] = temp;
  }
}

/**
 * Extracts top-K highest scoring items from an array in O(N log K) time using a Min-Heap,
 * without sorting the full array of N items (O(N log N)).
 */
export function extractTopK<T>(
  items: T[],
  k: number,
  scoreFn: (item: T) => number
): Array<{ item: T; score: number }> {
  if (items.length === 0 || k <= 0) return [];
  if (k >= items.length) {
    return items
      .map((item) => ({ item, score: scoreFn(item) }))
      .sort((a, b) => b.score - a.score);
  }

  // Min-Heap of size K
  const minHeap: Array<{ item: T; score: number }> = [];

  function siftDownMin(idx: number) {
    let curr = idx;
    const len = minHeap.length;
    while ((curr << 1) + 1 < len) {
      let left = (curr << 1) + 1;
      let right = left + 1;
      let smallest = curr;

      if (minHeap[left].score < minHeap[smallest].score) {
        smallest = left;
      }
      if (right < len && minHeap[right].score < minHeap[smallest].score) {
        smallest = right;
      }

      if (smallest !== curr) {
        const tmp = minHeap[curr];
        minHeap[curr] = minHeap[smallest];
        minHeap[smallest] = tmp;
        curr = smallest;
      } else {
        break;
      }
    }
  }

  function siftUpMin(idx: number) {
    let curr = idx;
    while (curr > 0) {
      const parent = (curr - 1) >> 1;
      if (minHeap[curr].score < minHeap[parent].score) {
        const tmp = minHeap[curr];
        minHeap[curr] = minHeap[parent];
        minHeap[parent] = tmp;
        curr = parent;
      } else {
        break;
      }
    }
  }

  for (const item of items) {
    const score = scoreFn(item);
    if (minHeap.length < k) {
      minHeap.push({ item, score });
      siftUpMin(minHeap.length - 1);
    } else if (score > minHeap[0].score) {
      minHeap[0] = { item, score };
      siftDownMin(0);
    }
  }

  // Extract from heap and sort descending
  return minHeap.sort((a, b) => b.score - a.score);
}
