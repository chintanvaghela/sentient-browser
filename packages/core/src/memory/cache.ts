import type { SemanticSnapshot } from '../semantic/types.js';

interface CacheEntry {
  snapshot: SemanticSnapshot;
  expiresAt: number;
}

export interface CacheOptions {
  defaultTtlMs?: number;
  maxEntries?: number;
}

/**
 * High-speed in-memory cache for parsed Semantic DOM snapshots.
 * Reduces redundant DOM extraction passes on recurring pages.
 */
export class SemanticCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTtlMs: number;
  private maxEntries: number;
  private hits = 0;
  private misses = 0;

  constructor(options: CacheOptions = {}) {
    this.defaultTtlMs = options.defaultTtlMs || 5 * 60 * 1000; // 5 minutes
    this.maxEntries = options.maxEntries || 100;
  }

  private normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      return u.origin + u.pathname.replace(/\/+$/, '');
    } catch (_) {
      return url.trim().replace(/\/+$/, '');
    }
  }

  get(url: string): SemanticSnapshot | null {
    const key = this.normalizeUrl(url);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.snapshot;
  }

  set(url: string, snapshot: SemanticSnapshot, ttlMs?: number): void {
    const key = this.normalizeUrl(url);

    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    const ttl = ttlMs !== undefined ? ttlMs : this.defaultTtlMs;
    this.cache.set(key, {
      snapshot,
      expiresAt: Date.now() + ttl
    });
  }

  has(url: string): boolean {
    const key = this.normalizeUrl(url);
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(url: string): boolean {
    const key = this.normalizeUrl(url);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? Math.round((this.hits / total) * 100) / 100 : 0;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate
    };
  }
}
