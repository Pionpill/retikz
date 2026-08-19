import { describe, expect, it } from 'vitest';

import * as chart from '../src';
import * as point from '../src/point';

describe('@retikz/chart-vanilla public surface', () => {
  it('keeps Point typed factories out of the base entry', () => {
    expect(chart).toHaveProperty('createChart');
    expect(chart).toHaveProperty('normalizeChart');
    expect(chart).toHaveProperty('renderChart');
    expect(chart).not.toHaveProperty('createScatterChart');
    expect(chart).not.toHaveProperty('createBubbleChart');
    expect(chart).not.toHaveProperty('createConnectedScatterChart');
    expect(chart).not.toHaveProperty('PointChartInputEmbedAdapter');
  });

  it('exports only Point typed factories and normalizers from the Point entry', () => {
    expect(point).not.toHaveProperty('createChart');
    expect(point).not.toHaveProperty('renderChart');
    expect(point).not.toHaveProperty('normalizeChart');
    expect(point.createScatterChart).toBeDefined();
    expect(point.createBubbleChart).toBeDefined();
    expect(point.createConnectedScatterChart).toBeDefined();
    expect(point.normalizeScatterChart).toBeDefined();
    expect(point.normalizeBubbleChart).toBeDefined();
    expect(point.normalizeConnectedScatterChart).toBeDefined();
    expect(point).not.toHaveProperty('PointChartInputEmbedAdapter');
  });
});
