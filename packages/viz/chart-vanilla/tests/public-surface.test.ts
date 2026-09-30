import { describe, expect, it } from 'vitest';

import * as chart from '../src';
import * as point from '../src/point';

const pointChartCases = ['Bubble', 'ConnectedScatter', 'RangedDot', 'Regression', 'Scatter', 'Strip'] as const;

describe('@retikz/chart-vanilla public surface', () => {
  it('keeps only shared rendering primitives on the root entry', () => {
    expect(chart).toHaveProperty('renderChart');
    expect(chart).not.toHaveProperty('ChartInputEmbedAdapter');
    expect(chart).toHaveProperty('normalizeChartCoordinate');
    expect(chart).not.toHaveProperty('createChart');
    expect(chart).not.toHaveProperty('normalizeChart');
    expect(chart).not.toHaveProperty('ChartProvider');
    expect(chart).not.toHaveProperty('InputChartFacet');
  });

  it('exports precise Point factories and normalizers from the Point entry', () => {
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
