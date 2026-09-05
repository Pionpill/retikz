import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { array, boolean, literal, number, strictObject } from 'zod';

import {
  ChartLayoutSchema,
  ChartPlotExtensionSchema,
  ChartPresentationSchema,
  createChartSourceSchema,
} from '../../src';

const FixtureChartSchema = strictObject({
  chartType: literal('fixture'),
  encodings: strictObject({ x: NonBlankStringSchema, y: NonBlankStringSchema }),
  properties: strictObject({ size: number().finite().optional(), visible: boolean().optional() }).optional(),
  marks: array(strictObject({ kind: literal('fixture-mark') })).optional(),
});

const FixtureSourceSchema = createChartSourceSchema('point', FixtureChartSchema);
const minimalSource = {
  namespace: 'chart',
  type: 'point',
  data: { reference: 'rows' },
  recipe: { chartType: 'fixture', encodings: { x: 'amount', y: 'margin' } },
} as const;

describe('Chart Source schema primitives', () => {
  it('parses the minimal strict family and recipe Source shape', () => {
    expect(FixtureSourceSchema.parse(minimalSource)).toEqual(minimalSource);
    expect(FixtureSourceSchema.safeParse({ ...minimalSource, extra: true }).success).toBe(false);
  });

  it('round-trips formal presentation and sparse Source-shaped defaults', () => {
    const source = FixtureSourceSchema.parse({
      ...minimalSource,
      background: { fill: '#f8fafc' },
      layout: { width: 640, height: 360, padding: 0, gap: 0 },
      presentation: { title: { text: 'Revenue', style: { font: { size: 20 } }, layout: { align: 'start' } } },
      chartDefaults: {
        layout: { padding: 12, gap: 4 },
        presentation: { title: { style: { textColor: '#0f172a' }, layout: { lineHeight: 24 } } },
      },
      plotExtension: { plotDefaults: { palette: { series: ['#0f766e'] } }, plotRules: [] },
    });
    expect(JSON.parse(JSON.stringify(source))).toEqual(source);
  });

  it('does not accept removed theme/token inputs or presentation shorthand in Direct IR', () => {
    expect(FixtureSourceSchema.safeParse({ ...minimalSource, theme: 'clean' }).success).toBe(false);
    expect(FixtureSourceSchema.safeParse({ ...minimalSource, chartThemeTokens: {} }).success).toBe(false);
    expect(FixtureSourceSchema.safeParse({ ...minimalSource, presentation: { title: 'Title' } }).success).toBe(false);
  });

  it('only permits defaultable visual and layout fields in chartDefaults', () => {
    expect(FixtureSourceSchema.safeParse({ ...minimalSource, chartDefaults: { layout: { width: 640 } } }).success).toBe(
      false,
    );
    expect(
      FixtureSourceSchema.safeParse({ ...minimalSource, chartDefaults: { presentation: { title: { text: 'new' } } } })
        .success,
    ).toBe(false);
    expect(FixtureSourceSchema.safeParse({ ...minimalSource, chartDefaults: { recipe: {} } }).success).toBe(false);
  });

  it('keeps fixed presentation slots, root coordinate, and explicit Plot fragment boundaries', () => {
    expect(ChartPresentationSchema.safeParse({ title: { text: 'Title' }, children: [] }).success).toBe(false);
    expect(ChartLayoutSchema.safeParse({ width: 0 }).success).toBe(false);
    expect(ChartPlotExtensionSchema.safeParse({ data: { reference: 'rows' } }).success).toBe(false);
    expect(FixtureSourceSchema.safeParse({ ...minimalSource, coordinate: 'polar2D' }).success).toBe(false);
  });
});
