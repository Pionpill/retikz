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
        resolve: () => ({ marks: [{ type: 'point', id: 'annotation', encoding: {} }] }),
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
    semanticMarks: [{ kind: 'demo', plotMarks: [{ type: 'point', id: 'semantic', encoding: {} }] }],
  }),
});
const source = sourceSchema.parse({
  namespace: 'chart',
  type: 'point',
  data: { reference: 'rows' },
  presentation: { title: { text: 'Revenue' } },
  chartDefaults: { presentation: { title: { style: { textColor: '#123456' }, layout: { align: 'middle' } } } },
  recipe: { chartType: 'demo', encodings: { x: 'x', y: 'y' } },
});

const resolve = (input = source) => {
  const registry = resolveChartProviderRegistry([
    {
      family: 'point',
      recipe,
      themeDefinitions: [
        defineChartTheme({
          name: 'clean',
          defaults: { layout: { gap: 8 } },
          plotDefaults: { palette: { series: ['#0f766e'] } },
        }),
      ],
    },
  ]);
  return resolveSelectedChart(input, {
    theme: { ...DEFAULT_RESOLVED_THEME, style: 'clean' },
    recipe,
    themeDefinitions: [registry.themes.get('clean')!],
    runtime: registry.runtime,
  });
};

describe('Chart resolve', () => {
  it('applies Definition and Source defaults only to existing presentation slots', () => {
    const result = resolve();
    expect(result.theme.defaults.layout?.gap).toBe(8);
    expect(result.presentation.surface.background).toEqual({ fill: '#FFFFFF' });
    expect(result.presentation.content).toMatchObject({ type: 'flexLayout' });
    expect(result.plot.plotDefaults).toEqual({ palette: { series: ['#0f766e'] } });
  });

  it('uses explicit Source values after chartDefaults and preserves authored marks', () => {
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

  it('keeps plotExtension guide replacement independent from recipe guide defaults', () => {
    const result = resolve(
      sourceSchema.parse({ ...source, plotExtension: { guides: [{ type: 'axis', dimension: 'x' }] } }),
    );
    expect(result.plot.guides).toEqual([{ type: 'axis', dimension: 'x' }]);
  });

  it('rejects unconsumed recipe slots with the source path', () => {
    expect(() =>
      sourceSchema.parse({ ...source, recipe: { ...source.recipe, encodings: { x: 'x', y: 'y', extra: 'z' } } }),
    ).toThrow();
  });
});
