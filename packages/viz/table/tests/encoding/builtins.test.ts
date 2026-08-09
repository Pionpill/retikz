import type { IRJsonObject } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { resolveCellVisualScaleRegistry } from '../../src';
import { resolveCellVisualScale } from '../../src/providers/encoding';

const context = {
  categoricalColors: ['red', 'green', 'blue', 'orange'],
  sequentialColors: ['#ffffff', '#000000'],
} as const;

const resolve = (name: string, options: IRJsonObject, values: ReadonlyArray<string | number | boolean>) =>
  resolveCellVisualScale({
    ref: { name, options },
    values,
    context,
    registry: resolveCellVisualScaleRegistry(),
  });

describe('built-in Cell visual scales', () => {
  it('uses first occurrence ordinal domains and rejects insufficient ranges', () => {
    const scale = resolve('ordinal-color', {}, ['b', 'a', 'b']);
    expect(scale).toMatchObject({ legendForm: 'swatch', domain: ['b', 'a'], range: ['red', 'green'] });
    expect(scale?.of('b')).toBe('red');
    expect(scale?.of('a')).toBe('green');
    expect(scale?.of('outside')).toBeUndefined();
    expect(() => resolve('ordinal-color', { domain: ['a', 'b'], range: ['red'] }, ['a'])).toThrow(/range/i);
    expect(() => resolve('ordinal-color', { range: [' '] }, ['a'])).toThrow('color must not be blank');
  });

  it('validates explicit ordinal domains and truncates extra colors', () => {
    expect(resolve('ordinal-color', { domain: ['a'], range: ['red', 'green'] }, [])).toMatchObject({
      domain: ['a'],
      range: ['red'],
    });
    expect(() => resolve('ordinal-color', { domain: [] }, [])).toThrow(/domain/i);
    expect(() => resolve('ordinal-color', { domain: ['a', 'a'] }, [])).toThrow(/domain/i);
    expect(() => resolve('ordinal-color', { domain: [null] }, [])).toThrow(/domain/i);
  });

  it('uses numeric extent, clamps, and maps equal sequential domains to the interpolated midpoint', () => {
    const extent = resolve('sequential-color', {}, [10, -5, 20]);
    expect(extent).toMatchObject({ legendForm: 'ramp', domain: [-5, 20], range: ['#ffffff', '#000000'] });
    expect(extent?.of(-100)).toBe('rgb(255, 255, 255)');
    expect(extent?.of(100)).toBe('rgb(0, 0, 0)');

    const equal = resolve('sequential-color', { domain: [5, 5] }, []);
    expect(equal?.of(5)).toBe('rgb(128, 128, 128)');
    expect(() => resolve('sequential-color', { domain: [2, 1] }, [])).toThrow(/domain/i);
    expect(() => resolve('sequential-color', {}, [1, '2'])).toThrow(/number/i);
    expect(() => resolve('sequential-color', { range: [' ', 'black'] }, [1])).toThrow('color must not be blank');
  });

  it('uses d3 threshold endpoint semantics and token fallback', () => {
    const scale = resolve('threshold-color', { thresholds: [10, 20] }, [9, 10, 20]);
    expect(scale).toMatchObject({
      legendForm: 'swatch',
      domain: [10, 20],
      range: ['red', 'green', 'blue'],
      edges: [10, 20],
    });
    expect([scale?.of(9), scale?.of(10), scale?.of(20)]).toEqual(['red', 'green', 'blue']);
    expect(() => resolve('threshold-color', { thresholds: [10, 10] }, [10])).toThrow(/threshold/i);
    expect(() => resolve('threshold-color', { thresholds: [10], range: ['red'] }, [10])).toThrow(/range/i);
    expect(() => resolve('threshold-color', { thresholds: [10] }, ['10'])).toThrow(/number/i);
    expect(() => resolve('threshold-color', { thresholds: [10], range: [' ', 'black'] }, [10])).toThrow(
      'color must not be blank',
    );
  });

  it('returns undefined only for empty automatic domains', () => {
    expect(resolve('ordinal-color', {}, [])).toBeUndefined();
    expect(resolve('sequential-color', {}, [])).toBeUndefined();
    expect(resolve('ordinal-color', { domain: ['known'] }, [])).toBeDefined();
    expect(resolve('sequential-color', { domain: [0, 1] }, [])).toBeDefined();
    expect(resolve('threshold-color', { thresholds: [1] }, [])).toBeDefined();
  });
});
