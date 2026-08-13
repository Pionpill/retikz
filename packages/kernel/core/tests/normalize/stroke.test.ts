import { describe, expect, it } from 'vitest';

import { normalizeDashPattern } from '../../src/normalize/stroke';

describe('normalizeDashPattern', () => {
  it('uses explicit dash pattern before dashed and dotted presets', () => {
    expect(normalizeDashPattern([0, 2], true, true)).toEqual([0, 2]);
  });

  it('uses dashed before dotted and preserves explicit false selectors', () => {
    expect(normalizeDashPattern(undefined, true, true)).toEqual([4, 2]);
    expect(normalizeDashPattern(undefined, false, true)).toEqual([1, 2]);
    expect(normalizeDashPattern(undefined, false, false)).toBeUndefined();
  });
});
