import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import * as chart from '../src';
import * as point from '../src/point';

const pointChartCases = [
  { chartType: 'bubble', prefix: 'Bubble', load: () => import('../src/point/bubble') },
  {
    chartType: 'connected-scatter',
    prefix: 'ConnectedScatter',
    load: () => import('../src/point/connected-scatter'),
  },
  { chartType: 'ranged-dot', prefix: 'RangedDot', load: () => import('../src/point/ranged-dot') },
  { chartType: 'regression', prefix: 'Regression', load: () => import('../src/point/regression') },
  { chartType: 'scatter', prefix: 'Scatter', load: () => import('../src/point/scatter') },
] as const;

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
    for (const { prefix } of pointChartCases) {
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

  it('publishes concrete chartType subpath entries without forwarding shared Chart declarations', async () => {
    for (const { load, prefix } of pointChartCases) {
      const module = await load();
      expect(module).toHaveProperty(`${prefix}Chart`);
      expect(module).toHaveProperty(`${prefix}Encodings`);
      expect(module).toHaveProperty(`${prefix}Properties`);
      expect(module).toHaveProperty(`${prefix}Mark`);
      expect(module).not.toHaveProperty('ChartData');
      expect(module).not.toHaveProperty('ChartExtension');
      expect(module).not.toHaveProperty('PathMark');
    }
  });

  it('keeps each concrete chartType closure independent from the Point component barrel', async () => {
    for (const { chartType } of pointChartCases) {
      const content = await readFile(
        fileURLToPath(new URL(`../src/point/${chartType}/index.ts`, import.meta.url)),
        'utf8',
      );
      expect(content).not.toContain("from '../components'");
      expect(content).not.toMatch(/from ['"]@retikz\/chart-vanilla\/point['"]/);
      expect(content).not.toContain('ChartData');
    }
  });
});
