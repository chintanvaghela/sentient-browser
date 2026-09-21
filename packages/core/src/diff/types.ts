import { SemanticNode } from '../semantic/types.js';

export type DiffOperationType =
  | 'NODE_ADDED'
  | 'NODE_REMOVED'
  | 'NODE_UPDATED';

export interface PropertyChange {
  from: any;
  to: any;
}

export interface NodeDelta {
  operation: DiffOperationType;
  nodeId: string;
  role: string;
  text?: string;
  changes?: Record<string, PropertyChange>;
  node?: SemanticNode;
}

export interface StateDiff {
  id: string;
  timestamp: number;
  url: string;
  title: string;
  operationsCount: number;
  deltas: NodeDelta[];
  compact: string;
}
