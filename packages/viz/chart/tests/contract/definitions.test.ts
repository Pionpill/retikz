import type { JsonObject } from '@retikz/foundation';

import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import { createChartSourceSchema, defineChartTheme } from '../../src';
import { defineChartMark, defineChartRecipe } from '../../src/_chart/contract';
import { resolveChartProviderRegistry } from '../../src/_chart/providers';
import { resolveSelectedChart } from '../../src/_chart/resolve';

const resolveDirectEncodings = (context: { encodings: Readonly<Record<string, unknown>> }) => ({
  encodings: context.encodings as JsonObject,
  transform: [],
  scales: [],
  positionScales: {},
  removedRecipeScales: new Set<string>(),
});
const recipeSourceSchema = createChartSourceSchema(
  'fixture',
  strictObject({ chartType: literal('fixture'), encodings: strictObject({}) }),
);
const recipe = defineChartRecipe({
  chartType: 'fixture',
  encodingSlots: [],
  schema: recipeSourceSchema,
  consumes: { encodings: [], properties: [] },
  marks: [],
  resolveEncodings: resolveDirectEncodings,
  resolve: () => ({
    scaffold: { scales: [], spatial: { coordinate: { type: 'cartesian2D' }, replaceable: false } },
    semanticMarks: [{ kind: 'fixture', plotMarks: [{ type: 'point', encoding: {} }] }],
  }),
});
const mark = defineChartMark({
  kind: 'fixture',
  schema: strictObject({ kind: literal('fixture') }),
  resolve: () => ({ marks: [{ type: 'point', encoding: {} }] }),
});

describe('Chart Definition contracts', () => {
  it('preserves definition identity and validates ordered slots', () => {
    expect(defineChartRecipe(recipe)).toBe(recipe);
    expect(defineChartMark(mark)).toBe(mark);
    expect(defineChartTheme({ name: 'fixture', defaults: { layout: { gap: 8 } } })).toEqual({
      name: 'fixture',
      defaults: { layout: { gap: 8 } },
    });
    expect(() =>
      resolveChartProviderRegistry([
        {
          family: 'fixture',
          recipe: defineChartRecipe({ ...recipe, encodingSlots: ['x', 'x'] }),
          themeDefinitions: [],
        },
      ]),
    ).toThrow();
  });

  it('applies guide defaults after scale defaults', () => {
    const guideRecipe = defineChartRecipe({
      ...recipe,
      resolveScaleDefaults: () => [{ type: 'linear', name: 'final-x' }],
      resolveGuideDefaults: context => {
        expect(context.scales.map(scale => scale.name)).toEqual(['final-x']);
        return [{ type: 'axis', dimension: 'x', grid: true }];
      },
    });
    const registry = resolveChartProviderRegistry([{ family: 'fixture', recipe: guideRecipe, themeDefinitions: [] }]);
    const source = recipeSourceSchema.parse({
      namespace: 'chart',
      type: 'fixture',
      data: { reference: 'rows' },
      recipe: { chartType: 'fixture', encodings: {} },
    });
    expect(
      resolveSelectedChart(source, {
        theme: DEFAULT_RESOLVED_THEME,
        recipe: guideRecipe,
        themeDefinitions: [],
        runtime: registry.runtime,
      }).plot.guides,
    ).toEqual([{ type: 'axis', dimension: 'x', grid: true }]);
  });
});
