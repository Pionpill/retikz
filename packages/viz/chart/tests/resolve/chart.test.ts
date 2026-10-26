import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal, strictObject, string } from 'zod';

import { createChartSourceSchema, defineChartTheme } from '../../src';
import { defineChartMark, defineChartRecipe } from '../../src/_chart/contract';
import { resolveChartProviderRegistry } from '../../src/_chart/providers';
import { resolveSelectedChart } from '../../src/_chart/resolve';

const sourceSchema = createChartSourceSchema(
  'point',
  strictObject({
    chartType: literal('demo'),
    encodings: strictObject({ x: string(), y: string() }),
    marks: strictObject({ kind: literal('annotation') })
      .array()
      .optional(),
  }),
);

const recipe = defineChartRecipe({
  chartType: 'demo',
  encodingSlots: ['x', 'y'],
  schema: sourceSchema,
  consumes: { encodings: ['x', 'y'], properties: [] },
  marks: [
    {
      definition: defineChartMark({
        kind: 'annotation',
        schema: strictObject({ kind: literal('annotation') }),
        resolve: () => ({ marks: [{ type: 'point', id: 'annotation', encodings: { position: { x: { value: 0 } } } }] }),
      }),
      inherit: {},
    },
  ],
  resolveEncodings: context => ({
    encodings: context.encodings,
    transform: [],
    scales: [],
    positionScales: {},
    removedRecipeScales: new Set<string>(),
  }),
  resolve: () => ({
    scaffold: {
      scales: [],
      spatial: { coordinate: { type: 'cartesian2D' }, replaceable: true },
      guides: { value: [], replaceable: true },
    },
    semanticMarks: [
      { kind: 'demo', plotMarks: [{ type: 'point', id: 'semantic', encodings: { position: { x: { value: 0 } } } }] },
    ],
  }),
});

const source = sourceSchema.parse({
  namespace: 'chart',
  type: 'point',
  data: { reference: 'rows' },
  presentation: { title: { text: 'Revenue' } },
  defaultChart: { presentation: { title: { style: { textColor: '#123456' }, layout: { align: 'middle' } } } },
  recipe: { chartType: 'demo', encodings: { x: 'x', y: 'y' } },
});

const resolve = (input = source) => {
  const registry = resolveChartProviderRegistry([
    {
      family: 'point',
      recipe,
      chartThemeDefinitions: [
        defineChartTheme({
          name: 'clean',
          defaults: { layout: { gap: 8 } },
          defaultPlot: { palette: { series: ['#0f766e'] } },
        }),
      ],
    },
  ]);
  return resolveSelectedChart(input, {
    theme: { ...DEFAULT_RESOLVED_THEME, name: 'clean' },
    recipe,
    chartThemeDefinitions: [registry.themes.get('clean')!],
    runtime: registry.runtime,
  });
};

describe('Chart 解析', () => {
  it('向 Plot 透明传递分组执行策略', () => {
    const input = sourceSchema.parse({
      ...source,
      dataExecution: { root: { mode: 'hybrid', external: 'sql' }, marks: { mode: 'builtin' } },
    });
    expect(resolve(input).plot.dataExecution).toEqual(input.dataExecution);
  });
  it('仅将 Definition 和 Source 默认应用于现有的演示槽位', () => {
    const result = resolve();

    expect(result.theme.defaults.layout?.gap).toBe(8);
    expect(result.presentation.surface.background).toEqual({ fill: '#FFFFFF' });
    expect(result.presentation.content).toMatchObject({ type: 'flexLayout' });
    expect(result.plot.defaultPlot).toEqual({ palette: { series: ['#0f766e'] } });
  });

  it('在 defaultChart 之后使用显式 Source 值并保留编写标记', () => {
    const result = resolve(
      sourceSchema.parse({
        ...source,
        background: { fill: '#f8fafc' },
        presentation: { title: { text: 'Revenue', style: { textColor: '#abcdef' } } },
        recipe: { ...source.recipe, marks: [{ kind: 'annotation' }] },
      }),
    );

    expect(result.presentation.surface.background).toEqual({ fill: '#f8fafc' });
    expect(result.plot.marks.map(mark => mark.id)).toEqual(['semantic', 'annotation']);
  });

  it('保持 plotExtension 辅助线替换独立于配方辅助线默认值', () => {
    const result = resolve(
      sourceSchema.parse({ ...source, plotExtension: { guides: [{ type: 'axis', dimension: 'x' }] } }),
    );

    expect(result.plot.guides).toEqual([{ type: 'axis', dimension: 'x' }]);
  });

  it('拒绝带有源路径的未使用的配方槽', () => {
    expect(() =>
      sourceSchema.parse({ ...source, recipe: { ...source.recipe, encodings: { x: 'x', y: 'y', extra: 'z' } } }),
    ).toThrow();
  });
});
