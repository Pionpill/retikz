import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { boolean, literal, strictObject } from 'zod';

import type { ChartLocatorOptions } from '../src';

import * as chart from '../src';
import * as point from '../src/point';
import * as bubble from '../src/point/bubble';
import * as connectedScatter from '../src/point/connected-scatter';
import * as rangedDot from '../src/point/ranged-dot';
import * as regression from '../src/point/regression';
import * as scatter from '../src/point/scatter';
import * as strip from '../src/point/strip';

const RecipeSchema = strictObject({
  chartType: literal('fixture'),
  encodings: strictObject({ x: NonBlankStringSchema, y: NonBlankStringSchema }),
  properties: strictObject({ visible: boolean().optional() }).optional(),
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

  it('exposes concrete Point schemas and provider contributions from the Point entry', () => {
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
    expect(point).toHaveProperty('qualifyScatterChartLocatorOptions');
    expect(point).not.toHaveProperty('PointChartSchema');
    expect(point).not.toHaveProperty('PointChartProvider');
    expect(point).not.toHaveProperty('defineChartRecipe');
    expect(point).not.toHaveProperty('defineChartMark');
    expect(point).not.toHaveProperty('ScatterChartDefinition');
    expect(point).not.toHaveProperty('ScatterMarkDefinition');
    expect(point).not.toHaveProperty('PathMarkDefinition');
  });

  it('keeps concrete chartType entries limited to schema and provider contribution', () => {
    for (const [concrete, contributionName, locatorName] of [
      [bubble, 'createBubbleChartProviderContribution', 'qualifyBubbleChartLocatorOptions'],
      [
        connectedScatter,
        'createConnectedScatterChartProviderContribution',
        'qualifyConnectedScatterChartLocatorOptions',
      ],
      [rangedDot, 'createRangedDotChartProviderContribution', 'qualifyRangedDotChartLocatorOptions'],
      [regression, 'createRegressionChartProviderContribution', 'qualifyRegressionChartLocatorOptions'],
      [scatter, 'createScatterChartProviderContribution', 'qualifyScatterChartLocatorOptions'],
    ] as const) {
      expect(concrete).toHaveProperty(contributionName);
      expect(concrete).toHaveProperty(locatorName);
      expect(concrete).not.toHaveProperty('defineChartRecipe');
      expect(concrete).not.toHaveProperty('defineChartMark');
      expect(concrete).not.toHaveProperty('ScatterChartDefinition');
      expect(concrete).not.toHaveProperty('ScatterMarkDefinition');
      expect(concrete).not.toHaveProperty('BubbleChartDefinition');
      expect(concrete).not.toHaveProperty('BubbleMarkDefinition');
      expect(concrete).not.toHaveProperty('RegressionChartDefinition');
      expect(concrete).not.toHaveProperty('RegressionMarkDefinition');
      expect(concrete).not.toHaveProperty('PathMarkDefinition');
    }

    expect(strip).toHaveProperty('StripChartSchema');
    expect(strip).toHaveProperty('createStripChartProviderContribution');
    expect(strip).not.toHaveProperty('StripChartDefinition');
    expect(strip).not.toHaveProperty('StripMarkDefinition');
  });

  it('publishes Chart-facing locator options without exposing recipe identities', () => {
    const options: ChartLocatorOptions = { facet: { row: 'north' } };
    expect(scatter.qualifyScatterChartLocatorOptions(options)).toEqual({
      facet: {
        id: '__chart.scatter.composition.facet',
        row: 'north',
      },
    });
    expect(bubble.qualifyBubbleChartLocatorOptions(options)).toEqual({
      facet: {
        id: '__chart.bubble.composition.facet',
        row: 'north',
      },
    });
    expect(regression.qualifyRegressionChartLocatorOptions(options)).toEqual({
      facet: {
        id: '__chart.regression.composition.facet',
        row: 'north',
      },
    });
  });

  it('keeps generated Source JSON-safe without publishing a wide Chart schema', () => {
    expect(chart).not.toHaveProperty('ChartSchema');
    expect(chart).not.toHaveProperty('IRChart');
    const sourceSchema = chart.createChartSourceSchema(
      'point',
      RecipeSchema,
      chart.createChartThemeSchema(strictObject({})).optional(),
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
