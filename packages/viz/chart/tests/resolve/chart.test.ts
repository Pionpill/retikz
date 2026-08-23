import { DEFAULT_RESOLVED_THEME, NodeTextAlign, ThemeMode } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { PlotMark, PlotThemeToken, PointMarkSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IRChartSource } from '../../src';
import type { ChartMarkResolveContext } from '../../src/_chart/contract';

import {
  ChartThemeToken,
  ChartWarningCode,
  createChartSourceSchema,
  createChartThemeSchema,
  defineChartTheme,
  RetikzChartErrorCode,
} from '../../src';
import { defineChartMark, defineChartRecipe } from '../../src/_chart/contract';
import { chartThemeDefinitionsOf, resolveChartProviderRegistry } from '../../src/_chart/providers';
import { resolveSelectedChart } from '../../src/_chart/resolve';

const encodingsSchema = z.strictObject({
  x: NonBlankStringSchema,
  y: NonBlankStringSchema,
  color: NonBlankStringSchema.optional(),
  ignored: NonBlankStringSchema.optional(),
  markOnly: NonBlankStringSchema.optional(),
});
const propertiesSchema = z.strictObject({ opacity: z.number().min(0).max(1).optional() });
const recipeThemeOverridesSchema = z.strictObject({
  glyph: NonBlankStringSchema.optional(),
  showGrid: z.boolean().optional(),
});
const recipeThemeResolutionSchema = z.strictObject({ glyph: NonBlankStringSchema, showGrid: z.boolean() });
const markSchema = z.strictObject({
  kind: z.literal('annotation'),
  override: z.boolean().optional(),
  encodings: encodingsSchema.partial().optional(),
  properties: propertiesSchema.optional(),
});
const recipeSchema = z.strictObject({
  chartType: z.literal('demo'),
  encodings: encodingsSchema,
  properties: propertiesSchema.optional(),
  marks: z.array(markSchema).optional(),
});
const sourceSchema = createChartSourceSchema(
  'point',
  recipeSchema,
  createChartThemeSchema(recipeThemeOverridesSchema).optional(),
);

const semanticMark = PointMarkSchema.parse({
  type: PlotMark.Point,
  id: 'semantic',
  encoding: { x: { field: 'x' }, y: { field: 'y' } },
});
const semanticSecondaryMark = PointMarkSchema.parse({
  type: PlotMark.Point,
  id: 'semantic-secondary',
  encoding: { x: { field: 'x' }, y: { field: 'y' } },
});

let inheritedContext: ChartMarkResolveContext | undefined;

const mark = defineChartMark({
  kind: 'annotation',
  schema: markSchema,
  resolve: context => {
    inheritedContext = context;
    return {
      marks: [
        PointMarkSchema.parse({
          type: PlotMark.Point,
          id: 'mark',
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        }),
      ],
    };
  },
});

const recipe = defineChartRecipe({
  chartType: 'demo',
  schema: sourceSchema,
  theme: {
    overridesSchema: recipeThemeOverridesSchema,
    resolutionSchema: recipeThemeResolutionSchema,
    fallback: { glyph: 'circle', showGrid: true },
  },
  consumes: { encodings: ['x', 'y', 'color'], properties: ['opacity'] },
  marks: [
    {
      definition: mark,
      inherit: { encodings: ['x', 'y', 'markOnly'], properties: ['opacity'] },
    },
  ],
  resolve: () => ({
    scaffold: {
      transform: [{ kind: 'sort', field: 'x', order: 'ascending' }],
      scales: [{ value: { type: 'linear', name: 'x' }, replaceable: true }],
      spatial: {
        coordinate: { type: 'cartesian2D', x: 'x', y: 'x' },
        replaceable: true,
      },
      guides: { value: [], replaceable: true },
    },
    semanticMarks: [{ kind: 'semantic', plotMarks: [semanticMark] }],
  }),
});

const registry = resolveChartProviderRegistry([
  {
    family: 'point',
    recipe,
    themeDefinitions: [
      defineChartTheme({
        name: 'core-style',
        tokens: {
          chart: {
            [ChartThemeToken.Padding]: 12,
            [ChartThemeToken.TitleForeground]: '#111111',
          },
          plot: { [PlotThemeToken.PlotAreaFill]: '#eeeeee' },
          recipes: { demo: { glyph: 'square' } },
        },
      }),
      defineChartTheme({
        name: 'authored',
        base: 'core-style',
        tokens: {
          chart: { [ChartThemeToken.Gap]: 9 },
          recipes: { demo: { showGrid: false } },
        },
      }),
    ],
  },
]);

const resolveWithRegistry = <TSource extends IRChartSource>(
  value: TSource,
  theme: typeof DEFAULT_RESOLVED_THEME,
  activeRegistry = registry,
) => {
  const selectedRecipe = activeRegistry.recipes.get(value.recipe.chartType);
  if (selectedRecipe === undefined) throw new Error(`Missing test recipe ${value.recipe.chartType}`);
  return resolveSelectedChart(value, {
    theme,
    recipe: selectedRecipe,
    themeDefinitions: chartThemeDefinitionsOf(value, theme, activeRegistry.themes),
  });
};

const source = sourceSchema.parse({
  namespace: 'chart',
  type: 'point',
  id: 'demo',
  data: { reference: 'rows' },
  presentation: {
    source: 'source',
    title: 'title',
    note: 'note',
  },
  theme: {
    base: 'authored',
    tokens: {
      chart: {
        [ChartThemeToken.Padding]: 8,
        [ChartThemeToken.TitleAlign]: NodeTextAlign.Middle,
      },
      plot: { [PlotThemeToken.PlotAreaFill]: '#ffffff' },
      recipe: { glyph: 'diamond' },
    },
  },
  layout: { width: 640 },
  recipe: {
    chartType: 'demo',
    encodings: { x: 'amount', y: 'margin', color: 'region' },
    properties: { opacity: 0 },
    marks: [{ kind: 'annotation' }],
  },
  plotExtension: {
    scales: [{ type: 'log', name: 'x' }],
    plotThemeTokens: { [PlotThemeToken.PlotTypographyFontSize]: 14 },
    marks: [
      PointMarkSchema.parse({
        type: PlotMark.Point,
        id: 'explicit',
        encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
      }),
    ],
  },
});

describe('Chart resolution', () => {
  it('rejects an authored recipe slot without an active consumer', () => {
    const unconsumed = sourceSchema.parse({
      ...source,
      recipe: {
        ...source.recipe,
        encodings: { ...source.recipe.encodings, ignored: 'ignored' },
      },
    });

    expect(() => resolveWithRegistry(unconsumed, DEFAULT_RESOLVED_THEME)).toThrowError(
      expect.objectContaining({
        details: expect.objectContaining({ path: ['recipe', 'encodings', 'ignored'] }),
      }),
    );
  });

  it('activates an inherited slot consumer only for an authored matching mark', () => {
    const withoutMark = sourceSchema.parse({
      ...source,
      recipe: {
        ...source.recipe,
        encodings: { ...source.recipe.encodings, markOnly: 'annotation-value' },
        marks: undefined,
      },
    });
    expect(() => resolveWithRegistry(withoutMark, DEFAULT_RESOLVED_THEME)).toThrowError(
      expect.objectContaining({
        details: expect.objectContaining({ path: ['recipe', 'encodings', 'markOnly'] }),
      }),
    );

    const withMark = sourceSchema.parse({
      ...source,
      recipe: {
        ...source.recipe,
        encodings: { ...source.recipe.encodings, markOnly: 'annotation-value' },
      },
    });
    expect(() => resolveWithRegistry(withMark, DEFAULT_RESOLVED_THEME)).not.toThrow();
    expect(inheritedContext?.inherited.encodings).toEqual({
      x: 'amount',
      y: 'margin',
      markOnly: 'annotation-value',
    });
  });

  it('cascades shell, recipe and Plot owner slices with explicit atomic precedence', () => {
    const theme = { ...DEFAULT_RESOLVED_THEME, style: 'core-style' };
    const result = resolveWithRegistry(source, theme);

    expect(result.theme.chart[ChartThemeToken.Padding]).toBe(8);
    expect(result.theme.chart[ChartThemeToken.Gap]).toBe(9);
    expect(result.theme.chart[ChartThemeToken.TitleAlign]).toBe(NodeTextAlign.Middle);
    expect(result.theme.recipe).toEqual({ glyph: 'diamond', showGrid: false });
    expect(result.plot.plotThemeTokens).toEqual({
      [PlotThemeToken.PlotAreaFill]: '#ffffff',
      [PlotThemeToken.PlotTypographyFontSize]: 14,
    });

    expect(
      resolveSelectedChart(source, {
        theme,
        recipe,
        themeDefinitions: chartThemeDefinitionsOf(source, theme, registry.themes),
      }),
    ).toEqual(result);
  });

  it('uses the Core mode fallback and rejects an unregistered Core style', () => {
    const withoutAuthoredTheme = sourceSchema.parse({ ...source, theme: undefined });
    const dark = resolveWithRegistry(withoutAuthoredTheme, {
      ...DEFAULT_RESOLVED_THEME,
      mode: ThemeMode.Dark,
      style: undefined,
    });
    expect(dark.theme.chart[ChartThemeToken.CanvasFill]).toBe('#09090B');

    expect(() =>
      resolveWithRegistry(withoutAuthoredTheme, { ...DEFAULT_RESOLVED_THEME, style: 'missing' }),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzChartErrorCode.UnknownDefinition,
        details: expect.objectContaining({ path: ['theme', 'style'] }),
      }),
    );
  });

  it.each([
    ['scale', { scales: [{ type: 'log', name: 'x' }] }, ['plotExtension', 'scales', 0]],
    ['spatial', { coordinate: { type: 'cartesian2D', x: 'x', y: 'x' } }, ['plotExtension', 'coordinate']],
    ['guides', { guides: [] }, ['plotExtension', 'guides']],
  ])('rejects an authored %s override when the recipe scaffold is not replaceable', (_, plotExtension, path) => {
    const lockedRecipe = defineChartRecipe({
      ...recipe,
      resolve: () => ({
        scaffold: {
          scales: [{ value: { type: 'linear', name: 'x' }, replaceable: false }],
          spatial: { coordinate: { type: 'cartesian2D', x: 'x', y: 'x' }, replaceable: false },
          guides: { value: [], replaceable: false },
        },
        semanticMarks: [{ kind: 'semantic', plotMarks: [semanticMark] }],
      }),
    });
    const lockedRegistry = resolveChartProviderRegistry([
      { family: 'point', recipe: lockedRecipe, themeDefinitions: [] },
    ]);
    const authored = sourceSchema.parse({ ...source, theme: undefined, plotExtension });

    expect(() => resolveWithRegistry(authored, DEFAULT_RESOLVED_THEME, lockedRegistry)).toThrowError(
      expect.objectContaining({
        code: RetikzChartErrorCode.InvalidResolvedPlot,
        details: expect.objectContaining({ path }),
      }),
    );
  });

  it('composes transforms, replaceable scales, semantic/authored/Plot marks and fixed presentation order', () => {
    const result = resolveWithRegistry(source, DEFAULT_RESOLVED_THEME);

    expect(result.plot.transform).toEqual([{ kind: 'sort', field: 'x', order: 'ascending' }]);
    expect(result.plot.id).toBe('demo/plot');
    expect(
      resolveWithRegistry(sourceSchema.parse({ ...source, id: undefined }), DEFAULT_RESOLVED_THEME).plot.id,
    ).toBeUndefined();
    expect(result.presentation.surface.id).toBe('demo');
    expect(result.plot.scales).toEqual([{ type: 'log', name: 'x' }]);
    expect(result.plot.marks.map(operation => operation.id)).toEqual(['semantic', 'mark', 'explicit']);
    expect(result.warnings).toEqual([]);
    expect(result.presentation.slots).toEqual(['title', 'plot', 'note', 'source']);
    expect(result.presentation.layout).toEqual({ width: 640 });
    expect(inheritedContext?.inherited).toEqual({
      encodings: { x: 'amount', y: 'margin' },
      properties: { opacity: 0 },
    });
  });

  it('replaces a matching semantic group atomically at its original position', () => {
    const overrideRecipe = defineChartRecipe({
      ...recipe,
      resolve: () => ({
        scaffold: {
          scales: [],
          spatial: { coordinate: { type: 'cartesian2D' }, replaceable: true },
        },
        semanticMarks: [{ kind: 'annotation', plotMarks: [semanticMark, semanticSecondaryMark] }],
      }),
    });
    const overrideRegistry = resolveChartProviderRegistry([
      { family: 'point', recipe: overrideRecipe, themeDefinitions: [] },
    ]);
    const authored = sourceSchema.parse({
      ...source,
      theme: undefined,
      recipe: { ...source.recipe, marks: [{ kind: 'annotation', override: true }] },
    });

    const result = resolveWithRegistry(authored, DEFAULT_RESOLVED_THEME, overrideRegistry);

    expect(result.plot.marks.map(operation => operation.id)).toEqual(['mark', 'explicit']);
    expect(result.warnings).toEqual([]);
  });

  it('appends an unmatched override and returns a stable compile warning', () => {
    const authored = sourceSchema.parse({
      ...source,
      theme: undefined,
      recipe: { ...source.recipe, marks: [{ kind: 'annotation', override: true }] },
    });

    const result = resolveWithRegistry(authored, DEFAULT_RESOLVED_THEME);

    expect(result.plot.marks.map(operation => operation.id)).toEqual(['semantic', 'mark', 'explicit']);
    expect(result.warnings).toEqual([
      {
        code: ChartWarningCode.MarkOverrideTargetNotFound,
        message: expect.stringMatching(/annotation|override|semantic/i),
        subPath: 'recipe.marks[0].override',
      },
    ]);
  });

  it('rejects multiple authored overrides for the same kind', () => {
    const authored = sourceSchema.parse({
      ...source,
      theme: undefined,
      recipe: {
        ...source.recipe,
        marks: [
          { kind: 'annotation', override: true },
          { kind: 'annotation', override: true },
        ],
      },
    });

    expect(() => resolveWithRegistry(authored, DEFAULT_RESOLVED_THEME)).toThrowError(
      expect.objectContaining({
        code: RetikzChartErrorCode.InvalidChartIR,
        details: expect.objectContaining({ path: ['recipe', 'marks', 1, 'override'] }),
      }),
    );
  });

  it('rejects duplicate built-in semantic group kinds', () => {
    const duplicateRecipe = defineChartRecipe({
      ...recipe,
      resolve: () => ({
        scaffold: {
          scales: [],
          spatial: { coordinate: { type: 'cartesian2D' }, replaceable: true },
        },
        semanticMarks: [
          { kind: 'semantic', plotMarks: [semanticMark] },
          { kind: 'semantic', plotMarks: [semanticSecondaryMark] },
        ],
      }),
    });
    const duplicateRegistry = resolveChartProviderRegistry([
      { family: 'point', recipe: duplicateRecipe, themeDefinitions: [] },
    ]);

    expect(() =>
      resolveWithRegistry(
        sourceSchema.parse({ ...source, theme: undefined }),
        DEFAULT_RESOLVED_THEME,
        duplicateRegistry,
      ),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzChartErrorCode.InvalidResolvedPlot,
        details: expect.objectContaining({ path: ['recipe', 'semanticMarks', 1, 'kind'] }),
      }),
    );
  });
});

describe('Chart resolve parse boundary', () => {
  it('resolve does not re-parse exact-parsed mark or inline recipe theme', () => {
    let markTransformCount = 0;
    let recipeThemeTransformCount = 0;
    let markSource: Record<string, unknown> | undefined;
    let recipeThemeTokens: Record<string, unknown> | undefined;

    const probeMarkSchema = z
      .strictObject({
        kind: z.literal('probe'),
        value: z.preprocess(value => (value === undefined ? value : String(value)), z.string()),
      })
      .transform(value => {
        markTransformCount += 1;
        return { ...value, value: `${value.value}|mark-${markTransformCount}` };
      });
    const probeRecipeThemeOverridesSchema = z
      .strictObject({
        marker: z.preprocess(value => (value === undefined ? value : String(value)), z.string()),
      })
      .transform(value => {
        recipeThemeTransformCount += 1;
        return { ...value, marker: `${value.marker}|theme-${recipeThemeTransformCount}` };
      });

    const probeMark = defineChartMark({
      kind: 'probe',
      schema: probeMarkSchema,
      resolve: context => {
        markSource = context.source;
        return {
          marks: [
            PointMarkSchema.parse({
              type: PlotMark.Point,
              id: 'probe-mark',
              encoding: { x: { field: 'x' }, y: { field: 'y' } },
            }),
          ],
        };
      },
    });
    const probeSourceSchema = createChartSourceSchema(
      'probe',
      z.strictObject({
        chartType: z.literal('probe'),
        encodings: z.strictObject({ x: z.string(), y: z.string() }),
        properties: z.strictObject({}).optional(),
        marks: z.array(probeMarkSchema).optional(),
      }),
      createChartThemeSchema(probeRecipeThemeOverridesSchema).optional(),
    );
    const probeRecipe = defineChartRecipe({
      chartType: 'probe',
      schema: probeSourceSchema,
      theme: {
        overridesSchema: probeRecipeThemeOverridesSchema,
        resolutionSchema: z.strictObject({ marker: z.string() }),
        fallback: { marker: 'fallback' },
      },
      consumes: { encodings: ['x', 'y'], properties: [] },
      marks: [{ definition: probeMark, inherit: {} }],
      resolve: context => {
        recipeThemeTokens = context.recipeThemeTokens;
        return {
          scaffold: {
            scales: [],
            spatial: { coordinate: { type: 'cartesian2D' }, replaceable: true },
          },
          semanticMarks: [
            {
              kind: 'probe',
              plotMarks: [
                PointMarkSchema.parse({
                  type: PlotMark.Point,
                  id: 'probe-semantic',
                  encoding: { x: { field: 'x' }, y: { field: 'y' } },
                }),
              ],
            },
          ],
        };
      },
    });
    const probeRegistry = resolveChartProviderRegistry([
      { family: 'probe', recipe: probeRecipe, themeDefinitions: [] },
    ]);
    const probeSource = probeSourceSchema.parse({
      namespace: 'chart',
      type: 'probe',
      data: { reference: 'rows' },
      theme: { tokens: { recipe: { marker: 7 } } },
      recipe: {
        chartType: 'probe',
        encodings: { x: 'amount', y: 'margin' },
        marks: [{ kind: 'probe', value: 42 }],
      },
    });

    expect(markTransformCount).toBe(1);
    expect(recipeThemeTransformCount).toBe(1);

    resolveWithRegistry(probeSource, DEFAULT_RESOLVED_THEME, probeRegistry);

    expect(markTransformCount).toBe(1);
    expect(recipeThemeTransformCount).toBe(1);
    expect(markSource).toEqual({ kind: 'probe', value: '42|mark-1' });
    expect(recipeThemeTokens).toEqual({ marker: '7|theme-1' });
  });
});
