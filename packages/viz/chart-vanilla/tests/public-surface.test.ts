import { describe, expect, it } from 'vitest';

import * as chart from '../src';
import * as point from '../src/point';

const pointChartCases = ['Bubble', 'ConnectedScatter', 'RangedDot', 'Regression', 'Scatter', 'Strip'] as const;

describe('@retikz/chart-vanilla 公开接口', () => {
  it('仅在根条目上保留共享渲染基元', () => {
    expect(chart).toHaveProperty('renderChart');
    expect(chart).not.toHaveProperty('ChartInputEmbedAdapter');
    expect(chart).toHaveProperty('normalizeChartCoordinate');
    expect(chart).not.toHaveProperty('createChart');
    expect(chart).not.toHaveProperty('normalizeChart');
    expect(chart).not.toHaveProperty('ChartProvider');
    expect(chart).not.toHaveProperty('InputChartFacet');
  });

  it('从点条目导出精确的点工厂和标准化器', () => {
    for (const prefix of pointChartCases) {
      expect(point).toHaveProperty(`${prefix[0].toLowerCase()}${prefix.slice(1)}Chart`);
      expect(point).toHaveProperty(`normalize${prefix}Chart`);
      expect(point).toHaveProperty(`${prefix}ChartInputEmbedAdapter`);
      expect(point).not.toHaveProperty(`create${prefix}Chart`);
    }

    expect(point).not.toHaveProperty('createChart');
    expect(point).not.toHaveProperty('normalizeChart');
  });
});
