import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { defineChartTheme, RetikzChartErrorCode } from '../../src';
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

  it('rejects non-plain Chart Theme Definition containers', () => {
    let nameGetterReadCount = 0;
    class ThemeDefinitionOutput {
      readonly name = 'class-theme';
      readonly tokens = { chart: { 'chart.padding': 12 } };
    }

    const nameGetterTheme = defineChartTheme({
      name: 'name-getter-theme',
      tokens: { chart: { 'chart.padding': 12 } },
    });
    Object.defineProperty(nameGetterTheme, 'name', {
      enumerable: true,
      get: () => {
        nameGetterReadCount += 1;
        return 'name-getter-theme';
      },
    });
    const getterTheme = Object.defineProperty({ name: 'getter-theme' }, 'tokens', {
      enumerable: true,
      get: () => ({ chart: { 'chart.padding': 12 } }),
    });
    const symbolTheme = {
      name: 'symbol-theme',
      tokens: { chart: { 'chart.padding': 12 } },
      [Symbol('metadata')]: true,
    };

    for (const themeDefinition of [new ThemeDefinitionOutput(), nameGetterTheme, getterTheme, symbolTheme]) {
      expect(() =>
        resolveChartProviderRegistry([{ family: 'point', recipe, themeDefinitions: [themeDefinition] }]),
      ).toThrow();
    }
    expect(nameGetterReadCount).toBe(0);
  });

  it('rejects explicit undefined in optional named Theme Definition fields', () => {
    const base = defineChartTheme({
      name: 'base',
      tokens: { chart: { 'chart.padding': 12 } },
    });
    const undefinedBase = defineChartTheme({
      name: 'undefined-base',
      tokens: { chart: { 'chart.padding': 12 } },
    });
    Object.defineProperty(undefinedBase, 'base', { enumerable: true, value: undefined });
    const undefinedTokens = defineChartTheme({ name: 'undefined-tokens', base: 'base' });
    Object.defineProperty(undefinedTokens, 'tokens', { enumerable: true, value: undefined });

    for (const themeDefinition of [undefinedBase, undefinedTokens]) {
      expect(() =>
        resolveChartProviderRegistry([{ family: 'point', recipe, themeDefinitions: [base, themeDefinition] }]),
      ).toThrow();
    }

    for (const slice of ['chart', 'plot', 'recipes']) {
      const tokens = {};
      Object.defineProperty(tokens, slice, { enumerable: true, value: undefined });
      const themeDefinition = defineChartTheme({ name: `undefined-${slice}`, base: 'base', tokens });

      expect(() =>
        resolveChartProviderRegistry([{ family: 'point', recipe, themeDefinitions: [base, themeDefinition] }]),
      ).toThrow();
    }
  });

  it('rejects invalid named Theme Definition envelope leaf values', () => {
    const base = defineChartTheme({
      name: 'base',
      tokens: { chart: { 'chart.padding': 12 } },
    });
    const functionTokens = defineChartTheme({ name: 'function-tokens', base: 'base' });
    Object.defineProperty(functionTokens, 'tokens', { enumerable: true, value: () => ({}) });
    const numericName = defineChartTheme({ name: 'numeric-name', base: 'base' });
    Object.defineProperty(numericName, 'name', { enumerable: true, value: 42 });
    const numericBase = defineChartTheme({
      name: 'numeric-base',
      tokens: { chart: { 'chart.padding': 12 } },
    });
    Object.defineProperty(numericBase, 'base', { enumerable: true, value: 42 });

    for (const themeDefinition of [functionTokens, numericName, numericBase]) {
      expect(() =>
        resolveChartProviderRegistry([{ family: 'point', recipe, themeDefinitions: [base, themeDefinition] }]),
      ).toThrowError(expect.objectContaining({ code: RetikzChartErrorCode.InvalidRegistry }));
    }
  });

  it('wraps a non-object named Theme Definition envelope failure', () => {
    expect(() =>
      Reflect.apply(resolveChartProviderRegistry, undefined, [[{ family: 'point', recipe, themeDefinitions: [null] }]]),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzChartErrorCode.InvalidRegistry,
        cause: expect.any(z.ZodError),
      }),
    );
  });

  it('rejects explicit undefined inside an active recipe token slice', () => {
    const recipeTokens = {};
    Object.defineProperty(recipeTokens, 'accent', { enumerable: true, value: undefined });
    const themeDefinition = defineChartTheme({
      name: 'undefined-recipe-token',
      tokens: { recipes: { fixture: recipeTokens } },
    });

    expect(() =>
      resolveChartProviderRegistry([{ family: 'point', recipe, themeDefinitions: [themeDefinition] }]),
    ).toThrowError(expect.objectContaining({ code: RetikzChartErrorCode.InvalidRegistry }));
  });

  it('keeps the Core theme context separate from active recipe registration', () => {
    expect(DEFAULT_RESOLVED_THEME.mode).toBeDefined();
  });
});
