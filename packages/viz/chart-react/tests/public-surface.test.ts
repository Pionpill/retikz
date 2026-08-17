import { describe, expect, it } from 'vitest';

import * as chart from '../src';
import * as point from '../src/point';

describe('@retikz/chart-react public surface', () => {
  it('keeps Point typed components out of the base entry', () => {
    expect(chart).toHaveProperty('Chart');
    expect(chart).toHaveProperty('ChartTitle');
    expect(chart).toHaveProperty('ChartThemeProvider');
    expect(chart).not.toHaveProperty('ScatterChart');
    expect(chart).not.toHaveProperty('BubbleChart');
    expect(chart).not.toHaveProperty('ConnectedScatterChart');
    expect(chart).not.toHaveProperty('PointChartInputEmbedAdapter');
  });

  it('exports Point typed components and base authoring from the Point entry', () => {
    expect(point.Chart).toBe(chart.Chart);
    expect(point.ChartTitle).toBe(chart.ChartTitle);
    expect(point.ScatterChart).toBeDefined();
    expect(point.BubbleChart).toBeDefined();
    expect(point.ConnectedScatterChart).toBeDefined();
    expect(point).not.toHaveProperty('PointChartInputEmbedAdapter');
  });
});
