import type { AnyTransformDefinition } from '@retikz/data';
import type { JsonObject } from '@retikz/foundation';

import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal, strictObject, string, undefined as zodUndefined, ZodError } from 'zod';

import { defineChartTheme, RetikzChartErrorCode } from '../../src';
import { defineChartRecipe, eraseChartRecipeDefinition } from '../../src/_chart/contract';
import { resolveChartProviderRegistry } from '../../src/_chart/providers';
import { resolveChartTheme } from '../../src/_chart/resolve';
import { createChartSourceSchema } from '../../src/_chart/schemas';
import { BubbleChartDefinition } from '../../src/point/bubble/recipe';
import { RegressionChartDefinition } from '../../src/point/regression/recipe';
import { ScatterChartDefinition } from '../../src/point/scatter/recipe';

const resolveDirectEncodings = (context: { encodings: Readonly<Record<string, unknown>> }) => ({
  encodings: context.encodings as JsonObject,
  transform: [],
  scales: [],
  positionScales: {},
  removedRecipeScales: new Set<string>(),
});

const recipeSchema = strictObject({
  chartType: literal('fixture'),
  encodings: strictObject({ x: string(), y: string() }),
});
const sourceSchema = createChartSourceSchema('point', recipeSchema, zodUndefined().optional());
const recipe = defineChartRecipe({
  chartType: 'fixture',
  encodingSlots: ['x', 'y'],
  schema: sourceSchema,
  theme: {
    overridesSchema: strictObject({ accent: string().optional() }),
    resolutionSchema: strictObject({ accent: string() }),
    fallback: { accent: '#000000' },
  },
  consumes: { encodings: ['x', 'y'], properties: [] },
  marks: [],
  resolveEncodings: resolveDirectEncodings,
  resolve: () => ({
    scaffold: {
      scales: [],
      spatial: { coordinate: { type: 'cartesian2D' }, replaceable: true },
    },
    semanticMarks: [{ kind: 'fixture', plotMarks: [{ type: 'point', encoding: {} }] }],
  }),
});

describe('active Chart provider registry', () => {
  it('builds one exact Point schema union for active Scatter, Bubble and Regression recipes', () => {
    const registry = resolveChartProviderRegistry([
      { family: 'point', recipe: eraseChartRecipeDefinition(ScatterChartDefinition), themeDefinitions: [] },
      { family: 'point', recipe: eraseChartRecipeDefinition(BubbleChartDefinition), themeDefinitions: [] },
      { family: 'point', recipe: eraseChartRecipeDefinition(RegressionChartDefinition), themeDefinitions: [] },
    ]);

    expect([...registry.recipes.keys()]).toEqual(['scatter', 'bubble', 'regression']);
    expect(
      registry.schema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: {
          chartType: 'bubble',
          encodings: { x: 'income', y: 'lifeExpectancy', size: 'population' },
        },
      }),
    ).toMatchObject({ recipe: { chartType: 'bubble' } });
    expect(
      registry.schema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: { chartType: 'regression', encodings: { x: 'x', y: 'y' } },
      }),
    ).toMatchObject({ recipe: { chartType: 'regression' } });
  });

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

  it('requires every merged recipe contribution to share runtime Definition array identities', () => {
    const transformDefinitions: Array<AnyTransformDefinition> = [];
    expect(() =>
      resolveChartProviderRegistry([
        { family: 'point', recipe, themeDefinitions: [], runtimeDefinitions: { transformDefinitions } },
        { family: 'point', recipe, themeDefinitions: [], runtimeDefinitions: { transformDefinitions } },
      ]),
    ).not.toThrow();

    expect(() =>
      resolveChartProviderRegistry([
        { family: 'point', recipe, themeDefinitions: [], runtimeDefinitions: { transformDefinitions: [] } },
        { family: 'point', recipe, themeDefinitions: [], runtimeDefinitions: { transformDefinitions: [] } },
      ]),
    ).toThrow(/share the same transformDefinitions array/);
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

  it('stores the active recipe Theme schema transform output for the cascade', () => {
    const transformedRecipe = defineChartRecipe({
      ...recipe,
      theme: {
        overridesSchema: strictObject({ accent: string().transform(() => 'normalized') }),
        resolutionSchema: strictObject({ accent: string() }),
        fallback: { accent: '#000000' },
      },
    });
    const themeDefinition = defineChartTheme({
      name: 'transformed-recipe-theme',
      tokens: { recipes: { fixture: { accent: 'authored' } } },
    });
    const registry = resolveChartProviderRegistry([
      { family: 'point', recipe: transformedRecipe, themeDefinitions: [themeDefinition] },
    ]);
    const source = registry.schema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: { chartType: 'fixture', encodings: { x: 'x', y: 'y' } },
    });
    const registeredTheme = registry.themes.get(themeDefinition.name);

    expect(registeredTheme).toBeDefined();
    expect(
      resolveChartTheme(source, transformedRecipe, {
        theme: DEFAULT_RESOLVED_THEME,
        themeDefinitions: registeredTheme === undefined ? [] : [registeredTheme],
      }).recipe,
    ).toEqual({ accent: 'normalized' });
  });

  it('projects Chart Theme Definition object containers through the owner schema', () => {
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
      const registry = resolveChartProviderRegistry([{ family: 'point', recipe, themeDefinitions: [themeDefinition] }]);
      const registeredTheme = registry.themes.get(themeDefinition.name);
      expect(registeredTheme).not.toBe(themeDefinition);
      expect(registeredTheme).toEqual({
        name: themeDefinition.name,
        tokens: { chart: { 'chart.padding': 12 } },
      });
    }
  });

  it('accepts explicit undefined in optional named Theme Definition fields', () => {
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
      const registry = resolveChartProviderRegistry([
        { family: 'point', recipe, themeDefinitions: [base, themeDefinition] },
      ]);
      const registeredTheme = registry.themes.get(themeDefinition.name);
      expect(registeredTheme).not.toBe(themeDefinition);
      expect(registeredTheme).toEqual(themeDefinition);
      expect(Object.hasOwn(registeredTheme ?? {}, themeDefinition === undefinedBase ? 'base' : 'tokens')).toBe(true);
    }

    for (const slice of ['chart', 'plot', 'recipes']) {
      const tokens = {};
      Object.defineProperty(tokens, slice, { enumerable: true, value: undefined });
      const themeDefinition = defineChartTheme({ name: `undefined-${slice}`, base: 'base', tokens });

      const registry = resolveChartProviderRegistry([
        { family: 'point', recipe, themeDefinitions: [base, themeDefinition] },
      ]);
      const registeredTokens = registry.themes.get(themeDefinition.name)?.tokens;
      expect(registeredTokens).not.toBe(tokens);
      expect(Object.hasOwn(registeredTokens ?? {}, slice)).toBe(true);
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

  it('wraps an invalid Chart owner token slice before checking whether it is empty', () => {
    const base = defineChartTheme({
      name: 'base',
      tokens: { chart: { 'chart.padding': 12 } },
    });
    const invalidChartTokens = defineChartTheme({ name: 'invalid-chart-tokens', base: 'base' });
    Object.defineProperty(invalidChartTokens, 'tokens', {
      enumerable: true,
      value: { chart: null },
    });

    expect(() =>
      resolveChartProviderRegistry([{ family: 'point', recipe, themeDefinitions: [base, invalidChartTokens] }]),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzChartErrorCode.InvalidRegistry,
        cause: expect.any(ZodError),
      }),
    );
  });

  it('wraps a non-object named Theme Definition envelope failure', () => {
    expect(() =>
      Reflect.apply(resolveChartProviderRegistry, undefined, [[{ family: 'point', recipe, themeDefinitions: [null] }]]),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzChartErrorCode.InvalidRegistry,
        cause: expect.any(ZodError),
      }),
    );
  });

  it('accepts explicit undefined inside an active recipe token slice', () => {
    const recipeTokens = {};
    Object.defineProperty(recipeTokens, 'accent', { enumerable: true, value: undefined });
    const themeDefinition = defineChartTheme({
      name: 'undefined-recipe-token',
      tokens: { recipes: { fixture: recipeTokens } },
    });

    const registry = resolveChartProviderRegistry([{ family: 'point', recipe, themeDefinitions: [themeDefinition] }]);
    const resolvedRecipeTokens = registry.themes.get(themeDefinition.name)?.tokens?.recipes?.fixture;
    expect(resolvedRecipeTokens).toHaveProperty('accent', undefined);
  });

  it('keeps the Core theme context separate from active recipe registration', () => {
    expect(DEFAULT_RESOLVED_THEME.mode).toBeDefined();
  });
});
