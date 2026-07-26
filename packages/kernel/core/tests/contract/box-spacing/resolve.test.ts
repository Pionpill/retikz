import { describe, expect, it } from 'vitest';

import type { IRBoxSpacing } from '../../../src';

import * as core from '../../../src';
import { resolveBoxSpacing } from '../../../src';

describe('resolveBoxSpacing', () => {
  it('is available from the package root', () => {
    expect('resolveBoxSpacing' in core).toBe(true);
  });

  it('applies a numeric value to all four sides', () => {
    expect(resolveBoxSpacing(3, 1)).toEqual({ top: 3, right: 3, bottom: 3, left: 3 });
  });

  it('uses fallback when the spacing value is omitted', () => {
    expect(resolveBoxSpacing(undefined, 2)).toEqual({ top: 2, right: 2, bottom: 2, left: 2 });
  });

  it('resolves default and axis values before fallback', () => {
    expect(resolveBoxSpacing({ default: 1 }, 9)).toEqual({ top: 1, right: 1, bottom: 1, left: 1 });
    expect(resolveBoxSpacing({ default: 1, x: 2, y: 3 }, 9)).toEqual({
      top: 3,
      right: 2,
      bottom: 3,
      left: 2,
    });
  });

  it('gives side values precedence over axis and default values', () => {
    expect(resolveBoxSpacing({ default: 1, x: 2, y: 3, top: 4, right: 5, bottom: 6, left: 7 }, 9)).toEqual({
      top: 4,
      right: 5,
      bottom: 6,
      left: 7,
    });
  });

  it('returns a detached result', () => {
    const value: IRBoxSpacing = Object.freeze({ default: 1, x: 2, top: 3 });
    const result = resolveBoxSpacing(value, 0);
    const second = resolveBoxSpacing(value, 0);

    expect(result).not.toBe(value);
    expect(second).not.toBe(result);
    result.left = 10;
    expect(value).toEqual({ default: 1, x: 2, top: 3 });
  });

  it('rejects a fallback that is not finite and non-negative', () => {
    for (const fallback of [-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => resolveBoxSpacing(undefined, fallback)).toThrow(
        'resolveBoxSpacing: fallback must be a finite non-negative number',
      );
    }
    expect(() => resolveBoxSpacing(1, -1)).toThrow('resolveBoxSpacing: fallback must be a finite non-negative number');
  });
});
