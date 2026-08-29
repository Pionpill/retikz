import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import * as chart from '../src';
import * as point from '../src/point';

describe('@retikz/chart-react public surface', () => {
  it('exports shared Chart declarations and presentation APIs from the root entry', () => {
    expect(chart.ChartData).toBeDefined();
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
    expect(point.BubbleChart).toBeDefined();
    expect(point.BubbleEncodings).toBeDefined();
    expect(point.BubbleProperties).toBeDefined();
    expect(point.BubbleMark).toBeDefined();
    expect(point.ScatterChart).toBeDefined();
    expect(point.ScatterEncodings).toBeDefined();
    expect(point.ScatterProperties).toBeDefined();
    expect(point.ScatterMark).toBeDefined();
    expect(point).not.toHaveProperty('ChartData');
    expect(point).not.toHaveProperty('ChartExtension');
    expect(point).not.toHaveProperty('PathMark');
    expect(point).not.toHaveProperty('Chart');
  });

  it('publishes concrete chartType subpath entries without forwarding shared Chart declarations', async () => {
    const bubble = await import('../src/point/bubble');
    const scatter = await import('../src/point/scatter');
    expect(bubble.BubbleChart).toBeDefined();
    expect(bubble.BubbleEncodings).toBeDefined();
    expect(bubble.BubbleProperties).toBeDefined();
    expect(bubble.BubbleMark).toBeDefined();
    expect(bubble).not.toHaveProperty('ChartData');
    expect(bubble).not.toHaveProperty('ChartExtension');
    expect(scatter.ScatterChart).toBeDefined();
    expect(scatter.ScatterEncodings).toBeDefined();
    expect(scatter.ScatterProperties).toBeDefined();
    expect(scatter.ScatterMark).toBeDefined();
    expect(scatter).not.toHaveProperty('ChartData');
    expect(scatter).not.toHaveProperty('ChartExtension');
    expect(scatter).not.toHaveProperty('PathMark');
  });

  it('keeps each concrete chartType closure independent from the Point component barrel', async () => {
    const cases = [
      { chartType: 'bubble', file: 'index.ts' },
      { chartType: 'scatter', file: 'index.ts' },
    ] as const;

    for (const item of cases) {
      const content = await readFile(
        fileURLToPath(new URL(`../src/point/${item.chartType}/${item.file}`, import.meta.url)),
        'utf8',
      );
      expect(content).not.toContain("from '../components'");
      expect(content).not.toMatch(/from ['"]@retikz\/chart-vanilla\/point['"]/);
      expect(content).not.toContain('ChartData');
    }
  });
});
