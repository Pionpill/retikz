import { describe, expect, it } from 'vitest';

import {
  createBubbleChartProviderContribution,
  createRegressionChartProviderContribution,
  createScatterChartProviderContribution,
} from '../../src/point';

describe('concrete Chart provider contributions', () => {
  it('uses one chart.point key, one maker reference and equal dependencies', () => {
    const scatter = createScatterChartProviderContribution();
    const provider = scatter.providers.at(-1);
    expect(provider?.key).toEqual({ capability: 'composite', namespace: 'chart', type: 'point' });
  });

  it('gives every concrete contribution a unique runtime dataset reference', () => {
    const first = createScatterChartProviderContribution().providers.at(-1);
    const second = createScatterChartProviderContribution().providers.at(-1);
    expect(Object.keys(first?.datasets ?? {})).not.toEqual(Object.keys(second?.datasets ?? {}));
  });

  it('accepts Plot lowering runtime Definitions as the second factory argument', () => {
    expect(() => createScatterChartProviderContribution([], { transformDefinitions: [] })).not.toThrow();
  });

  it('contributes Bubble through the same Point provider key', () => {
    const bubble = createBubbleChartProviderContribution();

    expect(bubble.providers.at(-1)?.key).toEqual({ capability: 'composite', namespace: 'chart', type: 'point' });
  });

  it('contributes Regression through the same Point provider key', () => {
    const regression = createRegressionChartProviderContribution();

    expect(regression.providers.at(-1)?.key).toEqual({
      capability: 'composite',
      namespace: 'chart',
      type: 'point',
    });
  });
});
