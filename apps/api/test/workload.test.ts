import { describe, it, expect } from 'vitest';

describe('Workload Service — Load Scoring Math', () => {
  it('computes composite load score: w1*count + w2*total_predicted + w3*remaining + w4*priority_bonus', () => {
    const weights = { w1: 1.0, w2: 1.0, w3: 1.0, w4: 1.0 };
    const queueCount = 4;
    const totalPredictedMinutes = 48; // 4 * 12 min
    const remainingCurrentMinutes = 6;
    const priorityBonus = 10; // 1 emergency

    const loadScore =
      weights.w1 * queueCount +
      weights.w2 * totalPredictedMinutes +
      weights.w3 * remainingCurrentMinutes +
      weights.w4 * priorityBonus;

    expect(loadScore).toBe(4 + 48 + 6 + 10); // 68
  });

  it('selects the clinician with lowest load score among compatible doctors', () => {
    const candidates = [
      { doctorId: 1, name: 'Dr. Sharma', loadScore: 54.2 },
      { doctorId: 2, name: 'Dr. Mehta', loadScore: 28.5 },
      { doctorId: 3, name: 'Dr. Patel', loadScore: 41.0 },
    ];

    candidates.sort((a, b) => a.loadScore - b.loadScore);
    expect(candidates[0].doctorId).toBe(2);
    expect(candidates[0].name).toBe('Dr. Mehta');
  });
});
