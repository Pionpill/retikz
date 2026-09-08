import type { JsonObject } from '@retikz/foundation';

import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal, strictObject, string, ZodError } from 'zod';

import { defineChartTheme, RetikzChartErrorCode } from '../../src';
import { defineChartRecipe, eraseChartRecipeDefinition } from '../../src/_chart/contract';
import { resolveChartFromProvider, resolveChartProviderRegistry } from '../../src/_chart/providers';
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
const sourceSchema = createChartSourceSchema(
  'point',
  strictObject({ chartType: literal('fixture'), encodings: strictObject({ x: string(), y: string() }) }),
);
const recipe = defineChartRecipe({
  chartType: 'fixture',
  encodingSlots: ['x', 'y'],
  schema: sourceSchema,
  consumes: { encodings: ['x', 'y'], properties: [] },
  marks: [],
  resolveEncodings: resolveDirectEncodings,
  resolve: () => ({
    scaffold: { scales: [], spatial: { coordinate: { type: 'cartesian2D' }, replaceable: true } },
    semanticMarks: [{ kind: 'fixture', plotMarks: [{ type: 'point', encoding: {} }] }],
  }),
});

describe('active Chart provider registry', () => {
  it('builds one exact Point schema union for active recipes', () => {
    const registry = resolveChartProviderRegistry([
      { family: 'point', recipe: eraseChartRecipeDefinition(ScatterChartDefinition), themeDefinitions: [] },
      { family: 'point', recipe: eraseChartRecipeDefinition(BubbleChartDefinition), themeDefinitions: [] },
      { family: 'point', recipe: eraseChartRecipeDefinition(RegressionChartDefinition), themeDefinitions: [] },
    ]);
    expect([...registry.recipes.keys()]).toEqual(['scatter', 'bubble', 'regression']);
    expect(
      registry.schema.safeParse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'rows' },
        recipe: { chartType: 'bubble', encodings: { x: 'income', y: 'life', size: 'population' } },
      }).success,
    ).toBe(true);
  });

  it('deduplicates identical recipes and rejects duplicate identities or family mismatches', () => {
    expect(
      resolveChartProviderRegistry([
        { family: 'point', recipe, themeDefinitions: [] },
        { family: 'point', recipe, themeDefinitions: [] },
      ]).recipes.get('fixture'),
    ).toBe(recipe);
    expect(() =>
      resolveChartProviderRegistry([
        { family: 'point', recipe, themeDefinitions: [] },
        { family: 'point', recipe: defineChartRecipe({ ...recipe, resolve: recipe.resolve }), themeDefinitions: [] },
      ]),
    ).toThrow();
    expect(() => resolveChartProviderRegistry([{ family: 'line', recipe, themeDefinitions: [] }])).toThrow(
      /family|line|point/i,
    );
  });

  it('resolves Core style chains, Chart defaults, and Plot extensions through the provider entry', () => {
    const base = defineChartTheme({
      name: 'base',
      defaults: { background: { fill: '#101010' }, layout: { gap: 4 } },
      plotDefaults: { palette: { series: ['#111111'] } },
    });
    const clean = defineChartTheme({
      name: 'clean',
      base: 'base',
      defaults: { layout: { padding: 8 } },
      plotDefaults: { palette: { categorical: ['#222222'] } },
    });
    const registry = resolveChartProviderRegistry([
      { family: 'point', recipe: eraseChartRecipeDefinition(ScatterChartDefinition), themeDefinitions: [base, clean] },
    ]);
    const source = registry.schema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      chartDefaults: { layout: { gap: 10 } },
      recipe: { chartType: 'scatter', encodings: { x: 'x', y: 'y' } },
      plotExtension: {
        plotDefaults: { palette: { series: ['#999999'] } },
        plotRules: [{ select: { dimension: 'x' }, axis: { grid: false } }],
      },
    });
    const resolution = resolveChartFromProvider(source, {
      theme: { ...DEFAULT_RESOLVED_THEME, style: 'clean' },
      registry,
    });

    expect(resolution.theme.defaults).toMatchObject({
      background: { fill: '#101010' },
      layout: { padding: 8, gap: 10 },
    });
    expect(resolution.theme.plotDefaults).toEqual({
      palette: { series: ['#111111'], categorical: ['#222222'] },
    });
    expect(resolution.plot.plotDefaults).toEqual({
      palette: { series: ['#999999'], categorical: ['#222222'] },
    });
    expect(resolution.plot.plotRules).toEqual(source.plotExtension?.plotRules);
  });

  it('wraps invalid Definition shapes at the registry boundary', () => {
    const invalid = Object.defineProperty({ name: 'invalid' }, 'defaults', { enumerable: true, value: { recipe: {} } });
    expect(() => resolveChartProviderRegistry([{ family: 'point', recipe, themeDefinitions: [invalid] }])).toThrowError(
      expect.objectContaining({ code: RetikzChartErrorCode.InvalidRegistry, cause: expect.any(ZodError) }),
    );
  });
});
