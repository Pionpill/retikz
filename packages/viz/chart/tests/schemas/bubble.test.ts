import { describe, expect, it } from 'vitest';

import {
  BubbleChartEncodingsSchema,
  BubbleChartMarkSchema,
  BubbleChartPropertiesSchema,
  BubbleChartSchema,
} from '../../src/point/bubble';

const bubble = {
  namespace: 'chart',
  type: 'point',
  data: { reference: 'rows' },
  recipe: {
    chartType: 'bubble',
    encodings: { x: 'income', y: 'lifeExpectancy', size: 'population' },
  },
} as const;

describe('Bubble Chart exact Source schema', () => {
  it('parses the exact Point family envelope and round-trips JSON', () => {
    const parsed = BubbleChartSchema.parse(bubble);

    expect(parsed).toEqual(bubble);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });

  it.each(['x', 'y', 'size'] as const)('requires a non-blank %s field mapping', role => {
    const encodings = { ...bubble.recipe.encodings };
    Reflect.deleteProperty(encodings, role);
    expect(BubbleChartEncodingsSchema.safeParse(encodings).success).toBe(false);
    expect(BubbleChartEncodingsSchema.safeParse({ ...bubble.recipe.encodings, [role]: '   ' }).success).toBe(false);
  });

  it('accepts the Bubble field mapping roles and only sqrt-compatible size scales', () => {
    expect(
      BubbleChartEncodingsSchema.safeParse({
        x: { field: 'income', scale: { operation: { type: 'log', name: 'incomeScale' } } },
        y: 'lifeExpectancy',
        size: {
          transform: { kind: 'normalize', field: 'population', as: 'populationShare' },
          output: 'populationShare',
          scale: { operation: { type: 'sqrt', name: 'populationSize' } },
        },
        color: 'continent',
        opacity: { aggregate: { kind: 'mean', field: 'confidence', as: 'meanConfidence' } },
        shape: 'category',
        column: 'continent',
        facet: { spacing: { panelGap: 12 } },
      }).success,
    ).toBe(true);

    expect(
      BubbleChartEncodingsSchema.safeParse({
        ...bubble.recipe.encodings,
        size: { field: 'population', scale: { operation: { type: 'linear', name: 'populationSize' } } },
      }).success,
    ).toBe(false);

    expect(
      BubbleChartEncodingsSchema.safeParse({
        x: 'income',
        y: 'lifeExpectancy',
        size: {
          transform: { kind: 'custom.population', field: 'population', as: 'adjustedPopulation' },
          output: 'adjustedPopulation',
        },
      }).success,
    ).toBe(true);
  });

  it('keeps size field-bound and unavailable from Bubble properties', () => {
    expect(
      BubbleChartPropertiesSchema.safeParse({ opacity: 0, shape: 'circle', domainPadding: { x: 0.02, y: 0.04 } })
        .success,
    ).toBe(true);
    expect(BubbleChartPropertiesSchema.safeParse({ size: 8 }).success).toBe(false);
    expect(BubbleChartMarkSchema.safeParse({ kind: 'bubble', properties: { domainPadding: 0.04 } }).success).toBe(
      false,
    );
  });

  it('rejects explicit size overrides from Bubble marks', () => {
    for (const mark of [
      { kind: 'bubble', encodings: { size: 'otherPopulation' } },
      { kind: 'bubble', properties: { size: 8 } },
    ]) {
      expect(
        BubbleChartSchema.safeParse({
          ...bubble,
          recipe: { ...bubble.recipe, marks: [mark] },
        }).success,
      ).toBe(false);
    }
  });

  it('enforces facet composition dependencies', () => {
    expect(
      BubbleChartEncodingsSchema.safeParse({
        ...bubble.recipe.encodings,
        facet: { empty: 'show' },
      }).success,
    ).toBe(false);
  });
});
