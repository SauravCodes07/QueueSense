import { describe, it, expect } from 'vitest';
import { calculateUpdatedEMA, computeEtaRange } from '../src/modules/prediction/prediction.service.js';

describe('Prediction Service — EMA & ETA Calculations', () => {
  it('calculates updated EMA pace with alpha = 0.3 (0.3*last + 0.7*old)', () => {
    // Current EMA: 12.0m, Last consultation duration: 20.0m
    // Expected: 0.3 * 20.0 + 0.7 * 12.0 = 6.0 + 8.4 = 14.4m
    const newEma = calculateUpdatedEMA(20.0, 12.0);
    expect(newEma).toBe(14.4);
  });

  it('updates EMA pace correctly for shorter consultation', () => {
    // Current EMA: 14.4m, Last consultation duration: 8.0m
    // Expected: 0.3 * 8.0 + 0.7 * 14.4 = 2.4 + 10.08 = 12.48m
    const newEma = calculateUpdatedEMA(8.0, 14.4);
    expect(newEma).toBe(12.48);
  });

  it('computes realistic ETA range windows without false precision', () => {
    // Central ETA: 30 minutes
    // Expected spread: max(2, 30 * 0.20) = 6 min -> Range 24–36 min
    const { lowMinutes, highMinutes, etaClock } = computeEtaRange(30);
    expect(lowMinutes).toBe(24);
    expect(highMinutes).toBe(36);
    expect(etaClock).toBeDefined();
  });

  it('ensures minimum spread window for short wait times', () => {
    // Central ETA: 5 minutes -> spread max(2, 1) = 2 min -> Range 3–7 min
    const { lowMinutes, highMinutes } = computeEtaRange(5);
    expect(lowMinutes).toBe(3);
    expect(highMinutes).toBe(7);
  });
});
