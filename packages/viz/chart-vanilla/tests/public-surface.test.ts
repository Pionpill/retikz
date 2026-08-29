import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import * as chart from '../src';
import * as point from '../src/point';

describe('@retikz/chart-vanilla public surface', () => {
  it('keeps only shared rendering primitives on the root entry', () => {
    expect(chart).toHaveProperty('renderChart');
    expect(chart).toHaveProperty('ChartInputEmbedAdapter');
    expect(chart).not.toHaveProperty('createChart');
    expect(chart).not.toHaveProperty('normalizeChart');
    expect(chart).not.toHaveProperty('ChartProvider');
    expect(chart).not.toHaveProperty('InputChartFacet');
  });

  it('removes the old root facet normalizer and type source', async () => {
    const rootSource = await readFile(fileURLToPath(new URL('../src/index.ts', import.meta.url)), 'utf8');
    const normalizeSource = await readFile(
      fileURLToPath(new URL('../src/normalize/chart/index.ts', import.meta.url)),
      'utf8',
    );
    expect(`${rootSource}\n${normalizeSource}`).not.toMatch(/InputChartFacet|normalizeChartFacet|\.\/facet/);
  });

  it('exports precise Point factories and normalizers from the Point entry', () => {
    expect(point.createScatterChart).toBeDefined();
    expect(point.normalizeScatterChart).toBeDefined();
    expect(point).not.toHaveProperty('createChart');
    expect(point).not.toHaveProperty('normalizeChart');
  });

  it('publishes concrete chartType subpath entries', async () => {
    const scatter = await import('../src/point/scatter');
    expect(scatter.createScatterChart).toBeDefined();
  });

  it('keeps each concrete chartType closure independent from the Point barrel', async () => {
    const cases = [{ chartType: 'scatter', files: ['index.ts', 'factory.ts', 'normalize.ts', 'types.ts'] }] as const;

    for (const item of cases) {
      const contents = (
        await Promise.all(
          item.files.map(file =>
            readFile(fileURLToPath(new URL(`../src/point/${item.chartType}/${file}`, import.meta.url)), 'utf8'),
          ),
        )
      ).join('\n');
      expect(contents).not.toMatch(/from ['"][^'"]*\/point['"]/);
      expect(contents).not.toContain("from '../index'");
      expect(contents).not.toContain("from '../../normalize/point'");
      expect(contents).toContain(`from '@retikz/chart/point/${item.chartType}'`);
    }
  });
});
