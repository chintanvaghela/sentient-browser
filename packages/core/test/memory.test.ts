import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MemoryStore } from '../src/memory/store.js';

describe('Memory Layer (MemoryStore)', () => {
  const tempFile = path.join(os.tmpdir(), `sentient-mem-test-${Date.now()}.json`);

  afterEach(() => {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (_) {}
    }
  });

  it('stores and recalls key-value variables', () => {
    const memory = new MemoryStore();
    expect(memory.recall('currentUser')).toBeUndefined();

    memory.remember('currentUser', { id: 'usr_1', email: 'agent@sentient.ai' });
    expect(memory.has('currentUser')).toBe(true);
    expect(memory.recall('currentUser')).toEqual({ id: 'usr_1', email: 'agent@sentient.ai' });

    memory.forget('currentUser');
    expect(memory.has('currentUser')).toBe(false);
  });

  it('records page visits in chronological history', () => {
    const memory = new MemoryStore();

    memory.recordVisit({
      url: 'https://example.com/login',
      title: 'Login Page',
      timestamp: 100,
      interactiveCount: 2
    });

    memory.recordVisit({
      url: 'https://example.com/dashboard',
      title: 'User Dashboard',
      timestamp: 200,
      interactiveCount: 5
    });

    const history = memory.getHistory();
    expect(history.length).toBe(2);
    // Most recent visit first
    expect(history[0].url).toBe('https://example.com/dashboard');
    expect(history[1].url).toBe('https://example.com/login');
  });

  it('saves and recalls filled form states', () => {
    const memory = new MemoryStore();

    memory.saveFormState('https://example.com/checkout', {
      name: 'Jane Doe',
      address: '123 AI Boulevard'
    });

    const fields = memory.getFormState('https://example.com/checkout');
    expect(fields).toBeDefined();
    expect(fields?.name).toBe('Jane Doe');
    expect(fields?.address).toBe('123 AI Boulevard');
  });

  it('persists and reloads memory state from disk', () => {
    const mem1 = new MemoryStore({ persistPath: tempFile });
    mem1.remember('cartToken', 'cart_99218');
    mem1.recordVisit({
      url: 'https://store.example.com',
      title: 'Store',
      timestamp: Date.now(),
      interactiveCount: 10
    });

    expect(fs.existsSync(tempFile)).toBe(true);

    // Load second instance from same path
    const mem2 = new MemoryStore({ persistPath: tempFile });
    expect(mem2.recall('cartToken')).toBe('cart_99218');
    expect(mem2.getHistory().length).toBe(1);
    expect(mem2.getHistory()[0].title).toBe('Store');
  });
});
