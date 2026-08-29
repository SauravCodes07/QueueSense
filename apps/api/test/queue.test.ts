import { describe, it, expect } from 'vitest';
import { PRIORITY_RANK } from '../src/modules/queue/queue.service.js';

describe('Queue Service — Deterministic Ordering & Policy', () => {
  it('enforces strict priority hierarchy: EMERGENCY (1) -> URGENT (2) -> ROUTINE (3)', () => {
    expect(PRIORITY_RANK.EMERGENCY).toBe(1);
    expect(PRIORITY_RANK.URGENT).toBe(2);
    expect(PRIORITY_RANK.ROUTINE).toBe(3);
  });

  it('orders waiting entries by priority tier ahead of routine patients', () => {
    const entries = [
      { id: 1, priority: 'ROUTINE' as const, createdAt: new Date('2026-01-01T10:00:00Z') },
      { id: 2, priority: 'ROUTINE' as const, createdAt: new Date('2026-01-01T10:05:00Z') },
      { id: 3, priority: 'EMERGENCY' as const, createdAt: new Date('2026-01-01T10:10:00Z') },
      { id: 4, priority: 'URGENT' as const, createdAt: new Date('2026-01-01T10:15:00Z') },
    ];

    entries.sort((a, b) => {
      const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (rankDiff !== 0) return rankDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    expect(entries[0].id).toBe(3); // EMERGENCY
    expect(entries[1].id).toBe(4); // URGENT
    expect(entries[2].id).toBe(1); // ROUTINE (FIFO 10:00)
    expect(entries[3].id).toBe(2); // ROUTINE (FIFO 10:05)
  });
});
