import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import * as chart from '../src';
import * as point from '../src/point';
import * as scatter from '../src/point/scatter';

const RecipeSchema = z.strictObject({
  chartType: z.literal('fixture'),
  encodings: z.strictObject({ x: z.string().min(1), y: z.string().min(1) }),
  properties: z.strictObject({ visible: z.boolean().optional() }).optional(),
});

describe('@retikz/chart public surface', () => {
  it('exports only family-independent Chart contracts from the root', () => {
    expect(chart).toHaveProperty('ChartPresentationSchema');
    expect(chart).toHaveProperty('ChartLayoutSchema');
    expect(chart).toHaveProperty('ChartPlotExtensionSchema');
    expect(chart).toHaveProperty('ChartThemeOverridesSchema');
    expect(chart).toHaveProperty('ChartThemeResolutionSchema');
    expect(chart).toHaveProperty('createChartSourceSchema');
    expect(chart).toHaveProperty('defineChartTheme');
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

  it('exposes concrete Point schemas and provider contributions from the Point entry', () => {
    expect(point.ChartFamily).toEqual({ Point: 'point' });
    expect(point.ChartType).toEqual({ Scatter: 'scatter' });
    expect(point).not.toHaveProperty('ChartMarkKind');
    expect(point).toHaveProperty('ScatterChartSchema');
    expect(point).toHaveProperty('createScatterChartProviderContribution');
    expect(point).not.toHaveProperty('PointChartSchema');
    expect(point).not.toHaveProperty('PointChartProvider');
    expect(point).not.toHaveProperty('defineChartRecipe');
    expect(point).not.toHaveProperty('defineChartMark');
    expect(point).not.toHaveProperty('ScatterChartDefinition');
    expect(point).not.toHaveProperty('ScatterMarkDefinition');
    expect(point).not.toHaveProperty('PathMarkDefinition');
  });

  it('keeps concrete chartType entries limited to schema and provider contribution', () => {
    for (const [concrete, contributionName] of [[scatter, 'createScatterChartProviderContribution']] as const) {
      expect(concrete).toHaveProperty(contributionName);
      expect(concrete).not.toHaveProperty('defineChartRecipe');
      expect(concrete).not.toHaveProperty('defineChartMark');
      expect(concrete).not.toHaveProperty('ScatterChartDefinition');
      expect(concrete).not.toHaveProperty('ScatterMarkDefinition');
      expect(concrete).not.toHaveProperty('PathMarkDefinition');
    }
  });

  it('keeps generated Source JSON-safe without publishing a wide Chart schema', () => {
    expect(chart).not.toHaveProperty('ChartSchema');
    expect(chart).not.toHaveProperty('IRChart');
    const sourceSchema = chart.createChartSourceSchema(
      'point',
      RecipeSchema,
      chart.createChartThemeSchema(z.strictObject({})).optional(),
    );
    const source = sourceSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'rows' },
      recipe: { chartType: 'fixture', encodings: { x: 'amount', y: 'margin' }, properties: { visible: false } },
    });
    expect(JSON.parse(JSON.stringify(source))).toEqual(source);
  });
});
