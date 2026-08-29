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

  it('accepts direct, aggregate, derived, scale, and facet mappings in the exact encoding slots', () => {
    const parsed = ScatterChartSchema.parse({
      ...scatter,
      recipe: {
        ...scatter.recipe,
        encodings: {
          x: {
            field: 'amount',
            scale: { operation: { type: 'log', name: 'amountScale', zero: false } },
          },
          y: {
            aggregate: { kind: 'mean', field: 'margin', as: 'meanMargin' },
          },
          color: {
            field: 'group',
            scale: { operation: { type: 'ordinal', name: 'groupColorScale' } },
          },
          size: {
            transform: { kind: 'normalize', field: 'weight', as: 'weightShare' },
            output: 'weightShare',
            scale: { operation: { type: 'sqrt', name: 'weightSizeScale' } },
          },
          opacity: {
            field: 'confidence',
            scale: { operation: { type: 'linear', name: 'confidenceOpacityScale' } },
          },
          shape: { field: 'shape' },
          row: 'channel',
          column: [{ field: 'region', order: ['east', 'west'] }],
          facet: { empty: 'show', spacing: { panelGap: 12 } },
        },
      },
    });

    expect(parsed.recipe.encodings).toMatchObject({
      x: { field: 'amount' },
      y: { aggregate: { kind: 'mean', as: 'meanMargin' } },
      row: 'channel',
      facet: { empty: 'show' },
    });
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });

  it('keeps string shorthand field-bound and properties constant-only', () => {
    expect(ScatterChartEncodingsSchema.safeParse({ x: 'amount', y: 'margin', color: 'group' }).success).toBe(true);
    expect(ScatterChartEncodingsSchema.safeParse({ x: '   ', y: 'margin' }).success).toBe(false);
    expect(ScatterChartEncodingsSchema.safeParse({ x: { field: 'amount' }, y: 'margin' }).success).toBe(true);
    expect(ScatterChartPropertiesSchema.safeParse({ size: 8, opacity: 0, shape: 'circle' }).success).toBe(true);
    expect(ScatterChartPropertiesSchema.safeParse({ size: { field: 'amount' } }).success).toBe(false);
  });

  it('rejects unsupported and malformed Scatter encoding slots at the encodings boundary', () => {
    for (const invalidEncodings of [
      { series: 'series' },
      { detail: 'detail' },
      { order: 'order' },
      { text: 'text' },
      { x: [] },
      { mystery: 'value' },
    ]) {
      const result = ScatterChartSchema.safeParse({
        ...scatter,
        recipe: {
          ...scatter.recipe,
          encodings: { ...scatter.recipe.encodings, ...invalidEncodings },
        },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.slice(0, 2).join('.') === 'recipe.encodings')).toBe(true);
      }
    }
  });

  it('enforces facet composition dependencies', () => {
    for (const encodings of [
      { x: 'amount', y: 'margin', facet: { empty: 'show' } },
      { x: 'amount', y: 'margin', column: [], facet: {} },
    ]) {
      expect(
        ScatterChartSchema.safeParse({
          ...scatter,
          recipe: { ...scatter.recipe, encodings },
        }).success,
      ).toBe(false);
    }
  });

  it('accepts registered-operation envelopes but rejects unsupported built-ins and invalid scale families', () => {
    expect(
      ScatterChartEncodingsSchema.safeParse({
        x: {
          transform: { kind: 'custom.shift', field: 'amount', as: 'shiftedAmount' },
          output: 'shiftedAmount',
          scale: { operation: { type: 'custom.position', name: 'shiftedScale' } },
        },
        y: 'margin',
        color: {
          field: 'group',
          scale: { operation: { type: 'custom.color', name: 'customColorScale' } },
        },
      }).success,
    ).toBe(true);

    for (const encodings of [
      { x: { transform: { kind: 'stack', y: 'amount' }, output: 'y1' }, y: 'margin' },
      { x: 'amount', y: 'margin', size: { field: 'weight', scale: { operation: { type: 'linear', name: 's' } } } },
      { x: 'amount', y: 'margin', opacity: { field: 'weight', scale: { operation: { type: 'sqrt', name: 'o' } } } },
      { x: 'amount', y: { aggregate: { kind: 'mean' } } },
    ]) {
      expect(ScatterChartEncodingsSchema.safeParse(encodings).success).toBe(false);
    }
  });

  it('restricts encoding jitter to the mapped position role', () => {
    expect(
      ScatterChartEncodingsSchema.safeParse({
        x: { transform: { kind: 'jitter', axis: 'x', xField: 'amount' }, output: 'amount' },
        y: { transform: { kind: 'jitter', axis: 'y', yField: 'margin' }, output: 'margin' },
      }).success,
    ).toBe(true);

    for (const x of [
      { transform: { kind: 'jitter', axis: 'both', xField: 'amount', yField: 'margin' }, output: 'amount' },
      { transform: { kind: 'jitter', axis: 'y', yField: 'margin' }, output: 'margin' },
      { transform: { kind: 'jitter', axis: 'x', xField: 'amount' }, output: 'other' },
    ]) {
      expect(ScatterChartEncodingsSchema.safeParse({ x, y: 'margin' }).success).toBe(false);
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
    expect(
      ScatterChartSchema.safeParse({
        ...scatter,
        recipe: { ...scatter.recipe, facet: { id: 'old', column: { field: 'region' } } },
      }).success,
    ).toBe(false);
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

    expect(
      ScatterChartSchema.safeParse({
        ...scatter,
        recipe: {
          ...scatter.recipe,
          marks: [{ kind: 'scatter', encodings: { x: { aggregate: { kind: 'count', as: 'count' } } } }],
        },
      }).success,
    ).toBe(false);
  });
});
