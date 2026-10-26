import { describe, expect, it } from 'vitest';

import {
  createBubbleChartProviderContribution,
  createRegressionChartProviderContribution,
  createScatterChartProviderContribution,
} from '../../src/point';

describe('具体的 Chart 提供者贡献', () => {
  it('使用一个 chart.point 键、一个工厂参考和相等的依赖关系', () => {
    const scatter = createScatterChartProviderContribution();
    const provider = scatter.providers.at(-1);

    expect(provider?.key).toEqual({ capability: 'composite', namespace: 'chart', type: 'point' });
  });

  it('在其提供者参数中保留每个具体配方', () => {
    const first = createScatterChartProviderContribution().providers.at(-1);
    const second = createScatterChartProviderContribution().providers.at(-1);

    expect(first?.params).toMatchObject({ family: 'point', recipe: { chartType: 'scatter' } });
    expect(second?.params).toEqual(first?.params);
    expect(first?.makeDefinition).toBe(second?.makeDefinition);
  });

  it('接受 Plot 下沉运行时定义作为第二个工厂参数', () => {
    expect(() => createScatterChartProviderContribution([], { definitions: { transforms: [] } })).not.toThrow();
  });

  it('通过相同的点提供者键贡献 Bubble', () => {
    const bubble = createBubbleChartProviderContribution();

    expect(bubble.providers.at(-1)?.key).toEqual({ capability: 'composite', namespace: 'chart', type: 'point' });
  });

  it('通过相同的点提供者键贡献回归', () => {
    const regression = createRegressionChartProviderContribution();

    expect(regression.providers.at(-1)?.key).toEqual({
      capability: 'composite',
      namespace: 'chart',
      type: 'point',
    });
  });
});
