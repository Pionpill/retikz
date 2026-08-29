import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import * as chart from '../src';
import * as point from '../src/point';

describe('@retikz/chart-react public surface', () => {
  it('keeps only shared presentation and Theme APIs on the root entry', () => {
    expect(chart).not.toHaveProperty('ChartFacet');
    expect(chart.ChartTitle).toBeDefined();
    expect(chart.ChartSubtitle).toBeDefined();
    expect(chart.ChartNote).toBeDefined();
    expect(chart.ChartSource).toBeDefined();
    expect(chart.ChartThemeProvider).toBeDefined();
    expect(chart).not.toHaveProperty('Chart');
    expect(chart).not.toHaveProperty('ScatterChart');
  });

  it('exports only precise Point components from the Point entry', () => {
    expect(point.ScatterChart).toBeDefined();
    expect(point.ScatterMark).toBeDefined();
    expect(point).not.toHaveProperty('PathMark');
    expect(point).not.toHaveProperty('Chart');
  });

  it('publishes concrete chartType subpath entries', async () => {
    const scatter = await import('../src/point/scatter');
    expect(scatter.ScatterChart).toBeDefined();
    expect(scatter.ScatterMark).toBeDefined();
    expect(scatter).not.toHaveProperty('PathMark');
  });

  it('keeps each concrete chartType closure independent from the Point component barrel', async () => {
    const cases = [{ chartType: 'scatter', file: 'index.tsx' }] as const;

    for (const item of cases) {
      const content = await readFile(
        fileURLToPath(new URL(`../src/point/${item.chartType}/${item.file}`, import.meta.url)),
        'utf8',
      );
      expect(content).not.toContain("from '../components'");
      expect(content).not.toMatch(/from ['"]@retikz\/chart-vanilla\/point['"]/);
      expect(content).toContain(`from '@retikz/chart-vanilla/point/${item.chartType}'`);
    }
  });
});
