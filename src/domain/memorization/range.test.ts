import { describe, expect, it } from 'vitest';
import { validateRange } from './range';

describe('validateRange', () => {
  it('accepts a valid range', () => {
    expect(validateRange(112, 1, 4)).toBeNull();
    expect(validateRange(2, 255, 255)).toBeNull();
  });
  it('rejects out-of-range, inverted, and non-integer input', () => {
    expect(validateRange(112, 1, 5)).toMatch(/has 4 verses/);
    expect(validateRange(112, 3, 2)).toMatch(/must come before/);
    expect(validateRange(112, 0, 2)).toMatch(/start at 1/);
    expect(validateRange(112, 1.5, 2)).toMatch(/whole verse numbers/);
    expect(validateRange(999, 1, 2)).toMatch(/choose a surah/i);
  });
});
