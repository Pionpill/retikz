import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { defineChartTheme } from '../../src';
import { defineChartRecipe } from '../../src/_chart/contract';
import { resolveChartProviderRegistry } from '../../src/_chart/providers';
import { createChartSourceSchema } from '../../src/_chart/schemas';

const recipeSchema = z.strictObject({
  chartType: z.literal('fixture'),
  encodings: z.strictObject({ x: z.string(), y: z.string() }),
});
const sourceSchema = createChartSourceSchema('point', recipeSchema, z.undefined().optional());
const recipe = defineChartRecipe({
  chartType: 'fixture',
  schema: sourceSchema,
  theme: {
    overridesSchema: z.strictObject({ accent: z.string().optional() }),
    resolutionSchema: z.strictObject({ accent: z.string() }),
    fallback: { accent: '#000000' },
  },
  consumes: { encodings: ['x', 'y'], properties: [] },
  marks: [],
  resolve: () => ({
    scaffold: {
      scales: [],
      spatial: { coordinate: { type: 'cartesian2D' }, replaceable: true },
    },
    semanticMarks: [{ kind: 'fixture', plotMarks: [{ type: 'point', encoding: {} }] }],
  }),
});

describe('active Chart provider registry', () => {
  it('deduplicates the same recipe contribution and builds a temporary schema union', () => {
    const registry = resolveChartProviderRegistry([
      { family: 'point', recipe, themeDefinitions: [] },
      { family: 'point', recipe, themeDefinitions: [] },
    ]);
    expect(registry.recipes.get('fixture')).toBe(recipe);
    expect(
      registry.schema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: { chartType: 'fixture', encodings: { x: 'x', y: 'y' } },
      }),
    ).toMatchObject({ recipe: { chartType: 'fixture' } });
  });

  it('rejects distinct Definitions with the same active chartType', () => {
    const duplicate = defineChartRecipe({ ...recipe, resolve: recipe.resolve });
    expect(() =>
      resolveChartProviderRegistry([
        { family: 'point', recipe, themeDefinitions: [] },
        { family: 'point', recipe: duplicate, themeDefinitions: [] },
      ]),
    ).toThrowError(/recipes "fixture" is registered more than once/);
  });

  it('rejects a concrete recipe contributed under a different family', () => {
    expect(() => resolveChartProviderRegistry([{ family: 'line', recipe, themeDefinitions: [] }])).toThrowError(
      /family|line|point/i,
    );
  });

  it('validates only recipe theme slices for active recipes', () => {
    expect(() =>
      resolveChartProviderRegistry([
        {
          family: 'point',
          recipe,
          themeDefinitions: [
            defineChartTheme({
              name: 'inactive-slice',
              tokens: { recipes: { inactive: { unused: true } } },
            }),
          ],
        },
      ]),
    ).not.toThrow();

    expect(() =>
      resolveChartProviderRegistry([
        {
          family: 'point',
          recipe,
          themeDefinitions: [
            defineChartTheme({ name: 'invalid-active', tokens: { recipes: { fixture: { unknown: true } } } }),
          ],
        },
      ]),
    ).toThrow();
  });

  it('keeps the Core theme context separate from active recipe registration', () => {
    expect(DEFAULT_RESOLVED_THEME.mode).toBeDefined();
  });
});
