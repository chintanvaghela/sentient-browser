export interface PageVisitRecord {
  url: string;
  title: string;
  timestamp: number;
  interactiveCount: number;
  summary?: string;
}

export interface FormMemoryRecord {
  url: string;
  timestamp: number;
  fields: Record<string, string>;
}

export interface MemorySnapshot {
  variables: Record<string, any>;
  history: PageVisitRecord[];
  forms: Record<string, FormMemoryRecord>;
}
