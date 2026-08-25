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

  it('accepts the Plot-owned facet configuration and round-trips it as compact Chart Source', () => {
    const parsed = ScatterChartSchema.parse({
      ...scatter,
      recipe: {
        ...scatter.recipe,
        facet: {
          id: 'regionFacet',
          row: { field: 'channel' },
          column: { field: 'region' },
          empty: 'show',
          spacing: { panelGap: 12 },
        },
      },
    });

    expect(parsed.recipe.facet).toEqual({
      id: 'regionFacet',
      row: { field: 'channel' },
      column: { field: 'region' },
      empty: 'show',
      spacing: { panelGap: 12 },
    });
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });

  it('rejects incomplete or Plot-only low-level facet controls at the Scatter recipe boundary', () => {
    for (const facet of [
      { id: 'missing-dimension' },
      { id: 'view', column: { field: 'region' }, view: 'panel' },
      { id: 'coordinate', column: { field: 'region' }, coordinate: { type: 'cartesian2D' } },
      { id: 'template', column: { field: 'region' }, viewIdTemplate: '{panel}' },
    ]) {
      expect(
        ScatterChartSchema.safeParse({
          ...scatter,
          recipe: { ...scatter.recipe, facet },
        }).success,
      ).toBe(false);
    }
  });

  it('rejects whitespace-only constant colors and paints', () => {
    for (const property of ['color', 'textColor', 'fill', 'stroke'] as const) {
      expect(ScatterChartPropertiesSchema.safeParse({ [property]: '   ' }).success).toBe(false);
    }
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
    const parsed = ScatterChartSchema.parse({
      ...scatter,
      recipe: {
        ...scatter.recipe,
        properties: { size: 0, opacity: 0 },
        marks: [
          { kind: 'scatter', override: true, properties: { opacity: 0.25 } },
          { kind: 'scatter', properties: { shape: 'circle' } },
        ],
      },
    });

    expect(parsed.recipe.marks).toHaveLength(2);
    expect(parsed.recipe.marks?.[0]).toMatchObject({ kind: 'scatter', override: true });
    expect(parsed.recipe.marks?.[1]).not.toHaveProperty('override');
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);

    expect(
      ScatterChartSchema.safeParse({
        ...scatter,
        recipe: {
          ...scatter.recipe,
          marks: [{ kind: 'scatter', override: 'yes' }],
        },
      }).success,
    ).toBe(false);

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
