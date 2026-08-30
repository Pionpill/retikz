import { describe, expect, it } from 'vitest';

import {
  RangedDotChartEncodingsSchema,
  RangedDotChartPropertiesSchema,
  RangedDotChartSchema,
} from '../../src/point/ranged-dot';

const minimalSource = {
  namespace: 'chart',
  type: 'point',
  data: { reference: 'rows' },
  recipe: {
    chartType: 'ranged-dot',
    encodings: { category: 'category', start: 'before', end: 'after' },
  },
} as const;

describe('Ranged Dot exact Source schema', () => {
  it('accepts the minimal JSON Source without materializing defaults', () => {
    expect(RangedDotChartSchema.parse(JSON.parse(JSON.stringify(minimalSource)))).toEqual(minimalSource);
  });

  it.each([
    ['category', { start: 'before', end: 'after' }],
    ['start', { category: 'category', end: 'after' }],
    ['end', { category: 'category', start: 'before' }],
  ])('requires %s', (_name, encodings) => {
    expect(() => RangedDotChartEncodingsSchema.parse(encodings)).toThrow();
  });

  it('accepts member styles and rejects topology or layer overrides', () => {
    expect(
      RangedDotChartPropertiesSchema.parse({
        point: { size: 5, strokeWidth: 1 },
        startPoint: { color: '#2563eb', shape: 'circle' },
        endPoint: { color: '#dc2626', shape: 'diamond' },
        range: { stroke: '#64748b', strokeWidth: 2, dashPattern: [4, 2] },
      }),
    ).toBeDefined();
    expect(() => RangedDotChartPropertiesSchema.parse({ point: { zIndex: 2 } })).toThrow();
    expect(() => RangedDotChartPropertiesSchema.parse({ startPoint: { dx: 3 } })).toThrow();
    expect(() => RangedDotChartPropertiesSchema.parse({ range: { closed: true } })).toThrow();
  });

  it('keeps color recipe-only and rejects unknown mark fields', () => {
    expect(() =>
      RangedDotChartSchema.parse({
        ...minimalSource,
        recipe: {
          ...minimalSource.recipe,
          marks: [{ kind: 'ranged-dot', encodings: { color: 'series' } }],
        },
      }),
    ).toThrow();
  });

  it('requires start and end to name the same authored x scale', () => {
    expect(() =>
      RangedDotChartEncodingsSchema.parse({
        category: 'category',
        start: { field: 'before', scale: { operation: { type: 'linear', name: 'startScale' } } },
        end: { field: 'after', scale: { reference: 'endScale' } },
      }),
    ).toThrow(/start and end must use the same x scale/i);

    expect(
      RangedDotChartEncodingsSchema.parse({
        category: 'category',
        start: { field: 'before', scale: { operation: { type: 'linear', name: 'rangeScale' } } },
        end: { field: 'after', scale: { reference: 'rangeScale' } },
      }),
    ).toBeDefined();
  });
});
