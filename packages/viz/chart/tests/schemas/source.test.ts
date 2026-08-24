import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { array, boolean, literal, number, strictObject } from 'zod';

import {
  ChartLayoutSchema,
  ChartPlotExtensionSchema,
  ChartPresentationSchema,
  ChartThemeToken,
  createChartSourceSchema,
  createChartThemeSchema,
} from '../../src';

const FixtureRecipeThemeSchema = strictObject({
  showAxes: boolean(),
  pointSize: number().finite().optional(),
});

const FixtureChartSchema = strictObject({
  chartType: literal('fixture'),
  encodings: strictObject({
    x: NonBlankStringSchema,
    y: NonBlankStringSchema,
    color: NonBlankStringSchema.optional(),
  }),
  properties: strictObject({
    size: number().finite().optional(),
    visible: boolean().optional(),
  }).optional(),
  marks: array(
    strictObject({
      kind: literal('fixture-mark'),
      encodings: strictObject({ color: NonBlankStringSchema.optional() }).optional(),
      properties: strictObject({ visible: boolean().optional() }).optional(),
    }),
  ).optional(),
});

const FixtureThemeSchema = createChartThemeSchema(FixtureRecipeThemeSchema).optional();
const FixtureSourceSchema = createChartSourceSchema('point', FixtureChartSchema, FixtureThemeSchema);

const minimalSource = {
  namespace: 'chart',
  type: 'point',
  data: { reference: 'rows' },
  recipe: {
    chartType: 'fixture',
    encodings: { x: 'amount', y: 'margin' },
  },
} as const;

describe('Chart Source schema primitives', () => {
  it('parses the minimal family and recipe Source shape', () => {
    expect(FixtureSourceSchema.parse(minimalSource)).toEqual(minimalSource);
  });

  it('reports a family mismatch at the root type field', () => {
    const result = FixtureSourceSchema.safeParse({ ...minimalSource, type: 'line' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['type']);
  });

  it('rejects a whitespace-only authored id', () => {
    expect(FixtureSourceSchema.safeParse({ ...minimalSource, id: '   ' }).success).toBe(false);
  });

  it('keeps the final root and recipe objects strict', () => {
    expect(FixtureSourceSchema.safeParse({ ...minimalSource, extra: true }).success).toBe(false);
    expect(
      FixtureSourceSchema.safeParse({
        ...minimalSource,
        recipe: { ...minimalSource.recipe, extra: true },
      }).success,
    ).toBe(false);
    expect(
      FixtureSourceSchema.safeParse({
        ...minimalSource,
        recipe: { ...minimalSource.recipe, properties: { extra: true } },
      }).success,
    ).toBe(false);
  });

  it('round-trips JSON Source without runtime values or resolved Plot payload', () => {
    const source = FixtureSourceSchema.parse({
      ...minimalSource,
      id: 'fixture',
      layout: { width: 640, height: 360 },
      recipe: {
        ...minimalSource.recipe,
        properties: { size: 0, visible: false },
        marks: [{ kind: 'fixture-mark', properties: { visible: false } }],
      },
      theme: {
        tokens: {
          chart: { [ChartThemeToken.TitleAlign]: 'start' },
          plot: {},
          recipe: { showAxes: false },
        },
      },
      plotExtension: { guides: [], meta: { owner: 'fixture' } },
    });
    expect(JSON.parse(JSON.stringify(source))).toEqual(source);
  });

  it('accepts field-bound encodings and constant-only properties', () => {
    expect(
      FixtureSourceSchema.safeParse({
        ...minimalSource,
        recipe: {
          ...minimalSource.recipe,
          encodings: { x: 'amount', y: 'margin', color: 'group' },
          properties: { size: 0, visible: false },
        },
      }).success,
    ).toBe(true);
    expect(
      FixtureSourceSchema.safeParse({
        ...minimalSource,
        recipe: {
          ...minimalSource.recipe,
          encodings: { x: { kind: 'constant', value: 1 }, y: 'margin' },
        },
      }).success,
    ).toBe(false);
    expect(
      FixtureSourceSchema.safeParse({
        ...minimalSource,
        recipe: { ...minimalSource.recipe, properties: { size: { kind: 'field', value: 'amount' } } },
      }).success,
    ).toBe(false);
  });

  it('requires positive finite external layout dimensions', () => {
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(ChartLayoutSchema.safeParse({ width: value }).success).toBe(false);
    }
    expect(FixtureSourceSchema.parse({ ...minimalSource, layout: { width: 640 } })).toEqual({
      ...minimalSource,
      layout: { width: 640 },
    });
  });

  it('uses fixed presentation slots and rejects children or authored positions', () => {
    const presentation = { title: 'Title', subtitle: 'Subtitle', note: 'Note', source: 'Source' };
    expect(ChartPresentationSchema.parse(presentation)).toEqual(presentation);
    expect(ChartPresentationSchema.safeParse({ children: [] }).success).toBe(false);
    expect(ChartPresentationSchema.safeParse({ title: 'Title', position: 'top' }).success).toBe(false);
  });

  it('keeps Chart, Plot, and recipe Theme slices strict and separated', () => {
    const theme = {
      tokens: {
        chart: { [ChartThemeToken.TitleAlign]: 'start' },
        plot: {},
        recipe: { showAxes: false },
      },
    };
    expect(FixtureSourceSchema.parse({ ...minimalSource, theme }).theme).toEqual(theme);
    expect(FixtureSourceSchema.safeParse({ ...minimalSource, theme: { tokens: {} } }).success).toBe(false);
    expect(
      FixtureSourceSchema.safeParse({
        ...minimalSource,
        theme: { tokens: { recipe: { showAxes: 'false' } } },
      }).success,
    ).toBe(false);
    expect(FixtureSourceSchema.safeParse({ ...minimalSource, chartThemeTokens: {} }).success).toBe(false);
  });

  it('accepts only the explicit Plot fragment fields', () => {
    expect(ChartPlotExtensionSchema.safeParse({ guides: [], meta: { source: 'demo' } }).success).toBe(true);
    expect(ChartPlotExtensionSchema.safeParse({ data: { reference: 'rows' } }).success).toBe(false);
    expect(ChartPlotExtensionSchema.safeParse({ namespace: 'plot', type: 'plot' }).success).toBe(false);
    expect(
      ChartPlotExtensionSchema.safeParse({
        coordinate: { type: 'cartesian1D', x: 'x' },
        composition: {
          defaultView: 'root',
          views: [{ id: 'root', coordinate: { type: 'cartesian1D', x: 'x' } }],
        },
      }).success,
    ).toBe(false);
  });

  it('rejects the superseded chart and plot root fields', () => {
    expect(
      FixtureSourceSchema.safeParse({
        ...minimalSource,
        recipe: undefined,
        chart: minimalSource.recipe,
      }).success,
    ).toBe(false);
    expect(
      FixtureSourceSchema.safeParse({
        ...minimalSource,
        plot: { guides: [] },
      }).success,
    ).toBe(false);
  });

  it('rejects non-JSON values at the Chart Source boundary', () => {
    expect(
      FixtureSourceSchema.safeParse({
        ...minimalSource,
        plotExtension: { meta: { invalid: () => 'runtime' } },
      }).success,
    ).toBe(false);
    expect(
      FixtureSourceSchema.safeParse({
        ...minimalSource,
        plotExtension: { meta: { invalid: Number.NaN } },
      }).success,
    ).toBe(false);
  });
});
