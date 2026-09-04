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
  { chartType: 'strip', prefix: 'Strip', load: () => import('../src/point/strip') },
] as const;

describe('@retikz/chart-vanilla public surface', () => {
  it('keeps only shared rendering primitives on the root entry', () => {
    expect(chart).toHaveProperty('renderChart');
    expect(chart).toHaveProperty('ChartInputEmbedAdapter');
    expect(chart).toHaveProperty('normalizeChartCoordinate');
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
    for (const { prefix } of pointChartCases) {
      expect(point).toHaveProperty(`create${prefix}Chart`);
      expect(point).toHaveProperty(`normalize${prefix}Chart`);
    }
    expect(point).not.toHaveProperty('createChart');
    expect(point).not.toHaveProperty('normalizeChart');
  });

  it('publishes concrete chartType subpath entries', async () => {
    for (const { load, prefix } of pointChartCases) {
      const module = await load();
      expect(module).toHaveProperty(`create${prefix}Chart`);
      expect(module).toHaveProperty(`normalize${prefix}Chart`);
    }
  });

  it('keeps each concrete chartType closure independent from the Point barrel', async () => {
    for (const { chartType } of pointChartCases) {
      const contents = (
        await Promise.all(
          ['index.ts', 'factory.ts', 'normalize.ts', 'types.ts'].map(file =>
            readFile(fileURLToPath(new URL(`../src/point/${chartType}/${file}`, import.meta.url)), 'utf8'),
          ),
        )
      ).join('\n');
      expect(contents).not.toMatch(/from ['"][^'"]*\/point['"]/);
      expect(contents).not.toContain("from '../index'");
      expect(contents).not.toContain("from '../../normalize/point'");
      expect(contents).toContain(`from '@retikz/chart/point/${chartType}'`);
    }
  });
});
