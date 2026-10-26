import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import type { JsonObject } from '@retikz/foundation';
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
    semanticMarks: [{ kind: 'fixture', plotMarks: [{ type: 'point', encodings: { position: { x: { value: 0 } } } }] }],
  }),
});

describe('活动的 Chart 提供者注册表', () => {
  it('为活动配方构建一个精确的点 schema 联合', () => {
    const registry = resolveChartProviderRegistry([
      { family: 'point', recipe: eraseChartRecipeDefinition(ScatterChartDefinition), chartThemeDefinitions: [] },
      { family: 'point', recipe: eraseChartRecipeDefinition(BubbleChartDefinition), chartThemeDefinitions: [] },
      { family: 'point', recipe: eraseChartRecipeDefinition(RegressionChartDefinition), chartThemeDefinitions: [] },
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

  it('删除重复的相同食谱并拒绝重复的身份或系列不匹配', () => {
    expect(
      resolveChartProviderRegistry([
        { family: 'point', recipe, chartThemeDefinitions: [] },
        { family: 'point', recipe, chartThemeDefinitions: [] },
      ]).recipes.get('fixture'),
    ).toBe(recipe);
    expect(() =>
      resolveChartProviderRegistry([
        { family: 'point', recipe, chartThemeDefinitions: [] },
        {
          family: 'point',
          recipe: defineChartRecipe({ ...recipe, resolve: recipe.resolve }),
          chartThemeDefinitions: [],
        },
      ]),
    ).toThrow();
    expect(() => resolveChartProviderRegistry([{ family: 'line', recipe, chartThemeDefinitions: [] }])).toThrow(
      /family|line|point/i,
    );
  });

  it('通过提供者条目解析 Core 样式链、Chart 默认值和 Plot 扩展', () => {
    const base = defineChartTheme({
      name: 'base',
      defaults: { background: { fill: '#101010' }, layout: { gap: 4 } },
      defaultPlot: { palette: { series: ['#111111'] } },
    });
    const clean = defineChartTheme({
      name: 'clean',
      base: 'base',
      defaults: { layout: { padding: 8 } },
      defaultPlot: { palette: { categorical: ['#222222'] } },
    });
    const registry = resolveChartProviderRegistry([
      {
        family: 'point',
        recipe: eraseChartRecipeDefinition(ScatterChartDefinition),
        chartThemeDefinitions: [base, clean],
      },
    ]);
    const source = registry.schema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      defaultChart: { layout: { gap: 10 } },
      recipe: { chartType: 'scatter', encodings: { x: 'x', y: 'y' } },
      plotExtension: {
        defaultPlot: { palette: { series: ['#999999'] } },
        plotRules: [{ select: { dimension: 'x' }, axis: { grid: false } }],
      },
    });
    const resolution = resolveChartFromProvider(source, {
      theme: { ...DEFAULT_RESOLVED_THEME, name: 'clean' },
      registry,
    });

    expect(resolution.theme.defaults).toMatchObject({
      background: { fill: '#101010' },
      layout: { padding: 8, gap: 10 },
    });
    expect(resolution.theme.defaultPlot).toEqual({
      palette: { series: ['#111111'], categorical: ['#222222'] },
    });
    expect(resolution.plot.defaultPlot).toEqual({
      palette: { series: ['#999999'], categorical: ['#222222'] },
    });
    expect(resolution.plot.plotRules).toEqual(source.plotExtension?.plotRules);
  });

  it('在注册表边界处包装无效的 Definition 形状', () => {
    const invalid = Object.defineProperty({ name: 'invalid' }, 'defaults', { enumerable: true, value: { recipe: {} } });

    expect(() =>
      resolveChartProviderRegistry([{ family: 'point', recipe, chartThemeDefinitions: [invalid] }]),
    ).toThrowError(
      expect.objectContaining({ code: RetikzChartErrorCode.InvalidRegistry, cause: expect.any(ZodError) }),
    );
  });
});
