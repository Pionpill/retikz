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

describe('Chart Source schema 基元', () => {
  it('解析最小严格族和配方 Source 形状', () => {
    expect(FixtureSourceSchema.parse(minimalSource)).toEqual(minimalSource);
    expect(FixtureSourceSchema.safeParse({ ...minimalSource, extra: true }).success).toBe(false);
  });

  it('往返正式表示和稀疏 Source 形默认值', () => {
    const source = FixtureSourceSchema.parse({
      ...minimalSource,
      background: { fill: '#f8fafc' },
      layout: { width: 640, height: 360, padding: 0, gap: 0 },
      presentation: { title: { text: 'Revenue', style: { font: { size: 20 } }, layout: { align: 'start' } } },
      defaultChart: {
        layout: { padding: 12, gap: 4 },
        presentation: { title: { style: { textColor: '#0f172a' }, layout: { lineHeight: 24 } } },
      },
      plotExtension: { defaultPlot: { palette: { series: ['#0f766e'] } }, plotRules: [] },
    });

    expect(JSON.parse(JSON.stringify(source))).toEqual(source);
  });

  it('不接受 Direct IR 中删除的主题/令牌输入或表示简写', () => {
    expect(FixtureSourceSchema.safeParse({ ...minimalSource, theme: 'clean' }).success).toBe(false);
    expect(FixtureSourceSchema.safeParse({ ...minimalSource, chartThemeTokens: {} }).success).toBe(false);
    expect(FixtureSourceSchema.safeParse({ ...minimalSource, presentation: { title: 'Title' } }).success).toBe(false);
  });

  it('仅允许 defaultChart 中的默认视觉和布局字段', () => {
    expect(FixtureSourceSchema.safeParse({ ...minimalSource, defaultChart: { layout: { width: 640 } } }).success).toBe(
      false,
    );
    expect(
      FixtureSourceSchema.safeParse({ ...minimalSource, defaultChart: { presentation: { title: { text: 'new' } } } })
        .success,
    ).toBe(false);
    expect(FixtureSourceSchema.safeParse({ ...minimalSource, defaultChart: { recipe: {} } }).success).toBe(false);
  });

  it('保持固定的表示槽、根坐标和显式的 Plot 片段边界', () => {
    expect(ChartPresentationSchema.safeParse({ title: { text: 'Title' }, children: [] }).success).toBe(false);
    expect(ChartLayoutSchema.safeParse({ width: 0 }).success).toBe(false);
    expect(ChartPlotExtensionSchema.safeParse({ data: { reference: 'rows' } }).success).toBe(false);
    expect(FixtureSourceSchema.safeParse({ ...minimalSource, coordinate: 'polar2D' }).success).toBe(false);
  });
});
