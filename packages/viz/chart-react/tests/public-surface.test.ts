import { describe, expect, it } from 'vitest';

import * as chart from '../src';
import * as point from '../src/point';

const pointChartCases = ['Bubble', 'ConnectedScatter', 'RangedDot', 'Regression', 'Scatter', 'Strip'] as const;

describe('@retikz/chart-react public surface', () => {
  it('exports shared Chart declarations and presentation APIs from the root entry', () => {
    expect(chart.ChartData).toBeDefined();
    expect(chart.ChartCoordinate).toBeDefined();
    expect(chart.ChartLayout).toBeDefined();
    expect(chart.ChartExtension).toBeDefined();
    expect(chart.ChartTitle).toBeDefined();
    expect(chart.ChartSubtitle).toBeDefined();
    expect(chart.ChartNote).toBeDefined();
    expect(chart.ChartSource).toBeDefined();
    expect(chart.ChartThemeProvider).toBeDefined();
    expect(chart).not.toHaveProperty('Chart');
    expect(chart).not.toHaveProperty('ScatterChart');
    expect(chart).not.toHaveProperty('ScatterEncodings');
  });

  it('exports only precise Point components from the Point entry', () => {
    for (const prefix of pointChartCases) {
      expect(point).toHaveProperty(`${prefix}Chart`);
      expect(point).toHaveProperty(`${prefix}Encodings`);
      expect(point).toHaveProperty(`${prefix}Properties`);
      expect(point).toHaveProperty(`${prefix}Mark`);
    }
    expect(point).not.toHaveProperty('ChartData');
    expect(point).not.toHaveProperty('ChartExtension');
    expect(point).not.toHaveProperty('PathMark');
    expect(point).not.toHaveProperty('Chart');
  });
});
