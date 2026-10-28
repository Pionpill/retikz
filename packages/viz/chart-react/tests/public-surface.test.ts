import { describe, expect, it } from 'vitest';

import * as chart from '../src';
import * as point from '../src/point';

const pointChartCases = ['Bubble', 'ConnectedScatter', 'RangedDot', 'Regression', 'Scatter', 'Strip'] as const;

describe('@retikz/chart-react 公开接口', () => {
  it('从根条目导出共享的 Chart 声明和表示 API', () => {
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

  it('仅从点条目中导出精确的点分量', () => {
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
