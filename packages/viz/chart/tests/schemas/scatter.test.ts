import { describe, expect, it } from 'vitest';

import { ScatterChartEncodingsSchema, ScatterChartPropertiesSchema, ScatterChartSchema } from '../../src/point/scatter';

const scatter = {
  namespace: 'chart',
  type: 'point',
  data: { reference: 'rows' },
  recipe: {
    chartType: 'scatter',
    encodings: { x: 'amount', y: 'margin' },
  },
} as const;

describe('Scatter Chart exact Source schema', () => {
  it('parses nested family and recipe envelope and round-trips JSON', () => {
    const parsed = ScatterChartSchema.parse(scatter);
    expect(parsed).toEqual(scatter);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });

  it('keeps encodings field-bound and properties constant-only', () => {
    expect(ScatterChartEncodingsSchema.safeParse({ x: 'amount', y: 'margin', color: 'group' }).success).toBe(true);
    expect(ScatterChartEncodingsSchema.safeParse({ x: '   ', y: 'margin' }).success).toBe(false);
    expect(ScatterChartEncodingsSchema.safeParse({ x: { field: 'amount' }, y: 'margin' }).success).toBe(false);
    expect(ScatterChartPropertiesSchema.safeParse({ size: 8, opacity: 0, shape: 'circle' }).success).toBe(true);
    expect(ScatterChartPropertiesSchema.safeParse({ size: { field: 'amount' } }).success).toBe(false);
  });

  it('rejects old flattened/config shapes and unknown fields', () => {
    expect(ScatterChartSchema.safeParse({ ...scatter, type: 'scatter' }).success).toBe(false);
    expect(ScatterChartSchema.safeParse({ ...scatter, config: {} }).success).toBe(false);
    expect(ScatterChartSchema.safeParse({ ...scatter, recipe: { ...scatter.recipe, unknown: true } }).success).toBe(
      false,
    );
    expect(ScatterChartSchema.safeParse({ ...scatter, unknown: true }).success).toBe(false);
  });

  it('accepts ordered Scatter marks and rejects Path as a Chart mark', () => {
    expect(
      ScatterChartSchema.parse({
        ...scatter,
        recipe: {
          ...scatter.recipe,
          properties: { size: 0, opacity: 0 },
          marks: [
            { kind: 'scatter', properties: { opacity: 0.25 } },
            { kind: 'scatter', properties: { shape: 'circle' } },
          ],
        },
      }).recipe.marks,
    ).toHaveLength(2);

    expect(
      ScatterChartSchema.safeParse({
        ...scatter,
        recipe: {
          ...scatter.recipe,
          marks: [{ kind: 'path', encodings: { order: 'time' } }],
        },
      }).success,
    ).toBe(false);
  });
});
