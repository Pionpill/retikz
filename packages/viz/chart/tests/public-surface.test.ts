import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { boolean, literal, strictObject } from 'zod';

import * as chart from '../src';
import * as point from '../src/point';

const RecipeSchema = strictObject({
  chartType: literal('fixture'),
  encodings: strictObject({ x: NonBlankStringSchema, y: NonBlankStringSchema }),
  properties: strictObject({ visible: boolean().optional() }).optional(),
});

describe('@retikz/chart 公开接口', () => {
  it('仅从根导出与系列无关的 Chart 契约', () => {
    expect(chart).toHaveProperty('ChartPresentationSchema');
    expect(chart).toHaveProperty('ChartLayoutSchema');
    expect(chart).toHaveProperty('ChartPlotExtensionSchema');
    expect(chart).toHaveProperty('createChartSourceSchema');
    expect(chart).toHaveProperty('defineChartTheme');
    expect(chart.ChartWarningCode).toEqual({
      MarkOverrideTargetNotFound: 'CHART_MARK_OVERRIDE_TARGET_NOT_FOUND',
    });
    expect(chart).not.toHaveProperty('defineChartRecipe');
    expect(chart).not.toHaveProperty('defineChartMark');
    expect(chart).not.toHaveProperty('ChartRecipeDefinition');
    expect(chart).not.toHaveProperty('ChartMarkDefinition');
    expect(chart).not.toHaveProperty('ChartResolution');
    expect(chart).not.toHaveProperty('ChartFamily');
    expect(chart).not.toHaveProperty('ChartType');
    expect(chart).not.toHaveProperty('createChartProvider');
    expect(chart).not.toHaveProperty('ChartProvider');
    expect(chart).not.toHaveProperty('defineChartFamily');
    expect(chart).not.toHaveProperty('parseChartSource');
    expect(chart).not.toHaveProperty('resolveChart');
  });

  it('公开来自点条目的具体点 schema 和提供者贡献', () => {
    expect(point.ChartFamily).toEqual({ Point: 'point' });
    expect(point.ChartType).toEqual({
      Bubble: 'bubble',
      ConnectedScatter: 'connected-scatter',
      RangedDot: 'ranged-dot',
      Regression: 'regression',
      Scatter: 'scatter',
      Strip: 'strip',
    });
    expect(point).not.toHaveProperty('ChartMarkKind');
    expect(point).toHaveProperty('ScatterChartSchema');
    expect(point).toHaveProperty('BubbleChartSchema');
    expect(point).toHaveProperty('RegressionChartSchema');
    expect(point).toHaveProperty('ConnectedScatterChartSchema');
    expect(point).toHaveProperty('RangedDotChartSchema');
    expect(point).toHaveProperty('StripChartSchema');
    expect(point).toHaveProperty('createScatterChartProviderContribution');
    expect(point).toHaveProperty('createBubbleChartProviderContribution');
    expect(point).toHaveProperty('createRegressionChartProviderContribution');
    expect(point).toHaveProperty('createConnectedScatterChartProviderContribution');
    expect(point).toHaveProperty('createRangedDotChartProviderContribution');
    expect(point).toHaveProperty('createStripChartProviderContribution');
    expect(point).not.toHaveProperty('PointChartSchema');
    expect(point).not.toHaveProperty('PointChartProvider');
    expect(point).not.toHaveProperty('defineChartRecipe');
    expect(point).not.toHaveProperty('defineChartMark');
    expect(point).not.toHaveProperty('scatterChartDefinition');
    expect(point).not.toHaveProperty('scatterMarkDefinition');
    expect(point).not.toHaveProperty('PathMarkDefinition');
  });

  it('保持生成的 Source JSON 安全，无需发布广泛的 Chart schema', () => {
    expect(chart).not.toHaveProperty('ChartSchema');
    expect(chart).not.toHaveProperty('IRChart');

    const sourceSchema = chart.createChartSourceSchema('point', RecipeSchema);
    const source = sourceSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: { chartType: 'fixture', encodings: { x: 'amount', y: 'margin' }, properties: { visible: false } },
    });

    expect(JSON.parse(JSON.stringify(source))).toEqual(source);
  });
});
