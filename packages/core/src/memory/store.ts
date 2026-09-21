import fs from 'node:fs';
import path from 'node:path';
import { PageVisitRecord, FormMemoryRecord, MemorySnapshot } from './types.js';

export interface MemoryStoreOptions {
  persistPath?: string;
}

/**
 * Built-in Agent Memory Layer.
 * Stores cross-session state, visited pages history, form inputs,
 * and key-value memories so agents never need to re-read or re-ask.
 */
export class MemoryStore {
  private variables: Map<string, any> = new Map();
  private history: PageVisitRecord[] = [];
  private forms: Map<string, FormMemoryRecord> = new Map();
  private persistPath?: string;

  constructor(options: MemoryStoreOptions = {}) {
    this.persistPath = options.persistPath;
    if (this.persistPath && fs.existsSync(this.persistPath)) {
      this.loadFromDisk();
    }
  }

  /**
   * Stores a key-value pair in agent memory.
   */
  remember(key: string, value: any): void {
    this.variables.set(key, value);
    this.autoPersist();
  }

  /**
   * Recalls a value from agent memory by key.
   */
  recall<T = any>(key: string): T | undefined {
    return this.variables.get(key) as T | undefined;
  }

  /**
   * Checks if a key exists in agent memory.
   */
  has(key: string): boolean {
    return this.variables.has(key);
  }

  /**
   * Deletes a key from agent memory.
   */
  forget(key: string): boolean {
    const deleted = this.variables.delete(key);
    if (deleted) this.autoPersist();
    return deleted;
  }

  /**
   * Clears all agent memory (variables, history, forms).
   */
  clear(): void {
    this.variables.clear();
    this.history = [];
    this.forms.clear();
    this.autoPersist();
  }

  /**
   * Records a visited page in history.
   */
  recordVisit(visit: PageVisitRecord): void {
    this.history.push(visit);
    this.autoPersist();
  }

  /**
   * Returns recent page visits, ordered latest first.
   */
  getHistory(limit: number = 20): PageVisitRecord[] {
    return [...this.history].reverse().slice(0, limit);
  }

  /**
   * Saves filled form state for a given URL.
   */
  saveFormState(url: string, fields: Record<string, string>): void {
    this.forms.set(url, {
      url,
      timestamp: Date.now(),
      fields
    });
    this.autoPersist();
  }

  /**
   * Retrieves saved form state for a given URL.
   */
  getFormState(url: string): Record<string, string> | undefined {
    return this.forms.get(url)?.fields;
  }

  /**
   * Returns a complete snapshot of all stored memory.
   */
  getSnapshot(): MemorySnapshot {
    const varsObj: Record<string, any> = {};
    for (const [k, v] of this.variables.entries()) {
      varsObj[k] = v;
    }

    const formsObj: Record<string, FormMemoryRecord> = {};
    for (const [k, v] of this.forms.entries()) {
      formsObj[k] = v;
    }

    return {
      variables: varsObj,
      history: [...this.history],
      forms: formsObj
    };
  }

  private autoPersist(): void {
    if (!this.persistPath) return;

    try {
      const dir = path.dirname(this.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.persistPath, JSON.stringify(this.getSnapshot(), null, 2), 'utf8');
    } catch (_) {}
  }

  private loadFromDisk(): void {
    if (!this.persistPath || !fs.existsSync(this.persistPath)) return;

    try {
      const data = JSON.parse(fs.readFileSync(this.persistPath, 'utf8')) as MemorySnapshot;
      if (data.variables) {
        for (const [k, v] of Object.entries(data.variables)) {
          this.variables.set(k, v);
        }
      }
      if (Array.isArray(data.history)) {
        this.history = data.history;
      }
      if (data.forms) {
        for (const [k, v] of Object.entries(data.forms)) {
          this.forms.set(k, v);
        }
      }
    } catch (_) {}
  }
}
