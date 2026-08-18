import { describe, expect, it } from 'vitest';

import * as chart from '../src';
import * as point from '../src/point';

describe('@retikz/chart-vanilla public surface', () => {
  it('keeps Point typed factories out of the base entry', () => {
    expect(chart).toHaveProperty('createChart');
    expect(chart).toHaveProperty('renderChart');
    expect(chart).not.toHaveProperty('createScatterChart');
    expect(chart).not.toHaveProperty('createBubbleChart');
    expect(chart).not.toHaveProperty('createConnectedScatterChart');
    expect(chart).not.toHaveProperty('normalizeChart');
    expect(chart).not.toHaveProperty('PointChartInputEmbedAdapter');
  });

  it('exports Point typed factories and base authoring from the Point entry', () => {
    expect(point.createChart).toBe(chart.createChart);
    expect(point.renderChart).toBe(chart.renderChart);
    expect(point.createScatterChart).toBeDefined();
    expect(point.createBubbleChart).toBeDefined();
    expect(point.createConnectedScatterChart).toBeDefined();
    expect(point).not.toHaveProperty('normalizeChart');
    expect(point).not.toHaveProperty('PointChartInputEmbedAdapter');
  });
});
