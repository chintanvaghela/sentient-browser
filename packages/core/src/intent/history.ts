import type { SemanticSnapshot } from '../semantic/types.js';
import type { StateDiff } from '../diff/types.js';

export type ActionType = 'goto' | 'click' | 'fill' | 'hover' | 'scroll';

export interface ActionRecord {
  id: string;
  timestamp: number;
  type: ActionType;
  target?: string;
  urlBefore: string;
  urlAfter?: string;
  prevValue?: string;
  prevSnapshot?: SemanticSnapshot;
  diff?: StateDiff;
}

/**
 * Maintains an append-only journal of actions executed on a page,
 * supporting inverse action generation and state rollback.
 */
export class ActionJournal {
  private records: ActionRecord[] = [];
  private maxHistory: number;

  constructor(options: { maxHistory?: number } = {}) {
    this.maxHistory = options.maxHistory || 50;
  }

  push(record: ActionRecord): void {
    this.records.push(record);
    if (this.records.length > this.maxHistory) {
      this.records.shift();
    }
  }

  pop(): ActionRecord | undefined {
    return this.records.pop();
  }

  peek(): ActionRecord | undefined {
    return this.records[this.records.length - 1];
  }

  clear(): void {
    this.records = [];
  }

  get length(): number {
    return this.records.length;
  }

  getAll(): ActionRecord[] {
    return [...this.records];
  }
}
