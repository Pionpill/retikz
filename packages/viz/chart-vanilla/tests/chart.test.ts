import type { IRPlotSpec } from '@retikz/plot';
import type { InputPlot } from '@retikz/plot-vanilla';

import { ChartProvider, defineChartThemeStyle } from '@retikz/chart';
import { defineThemeStyle } from '@retikz/core';
import { FlexLayoutProvider } from '@retikz/layout';
import { definePlotThemeStyle, getDefaultPlotThemePreset, PlotProviderKey } from '@retikz/plot';
import { SurfaceProvider } from '@retikz/standard';
import { PathClipProvider } from '@retikz/standard/clip';
import { describe, expect, it } from 'vitest';

import { getDefaultChartThemePreset } from '../../chart/src/base/style';
import { createChart, renderChart } from '../src';
import { createConnectedScatterChart, createScatterChart } from '../src/point';

const plot: IRPlotSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'countries' },
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [{ type: 'point', encoding: { x: { field: 'income' }, y: { field: 'life' } } }],
};

const plotInput = {
  data: { reference: 'countries' },
  scales: [
    { type: 'linear' as const, name: 'x' },
    { type: 'linear' as const, name: 'y' },
  ],
  coordinate: { type: 'cartesian2D' as const, x: 'x', y: 'y' },
  marks: [{ type: 'point' as const, encoding: { x: { field: 'income' }, y: { field: 'life' } } }],
} satisfies InputPlot;

const brandCoreTheme = defineThemeStyle({
  name: 'brand',
  resolve: () => ({
    semantic: { error: '#aa0000', success: '#00aa00', warning: '#aaaa00' },
    categorical: ['#112233'],
  }),
});

const brandChartTheme = defineChartThemeStyle({
  name: 'brand',
  resolve: theme => ({ ...getDefaultChartThemePreset(theme.mode), 'chart.canvas.fill': '#f0f9ff' }),
});

const brandPlotTheme = definePlotThemeStyle({
  name: 'brand',
  resolve: theme => ({
    tokens: { ...getDefaultPlotThemePreset(theme.mode), 'plot.palette.series': ['#7c3aed'] },
    tokenRules: [],
  }),
});

describe('Chart Vanilla authoring', () => {
  it('normalizes an explicit Plot Vanilla input before creating Chart IR', () => {
    const result = createChart({
      plot: { input: plotInput },
      datasets: { countries: [] },
    });

    expect(result.chart.plot).toMatchObject({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'countries' },
      marks: [{ type: 'point' }],
    });
    expect(result.input.plot).toEqual({ input: plotInput });
  });

  it('passes an explicit Plot IR through the source boundary without authoring fields', () => {
    const result = createChart({
      plot: { spec: plot },
      datasets: { countries: [] },
    });

    expect(result.input.plot).toEqual({ spec: plot });
    expect(result.chart.plot).toMatchObject(plot);
  });

  it('creates canonical ordered presentation and its complete provider graph', () => {
    const result = createChart({
      plot: { spec: plot },
      datasets: { countries: [] },
      title: 'Income and life expectancy',
      presentation: [
        { preset: 'subtitle', position: 'top', text: '2023 estimates' },
        { preset: 'source', position: 'bottom', text: 'World Bank' },
      ],
    });

    expect(result.chart.presentation?.children.map(item => item.key)).toEqual([
      'chart.presentation.subtitle',
      'chart.presentation.title',
      'chart.plot',
      'chart.presentation.source',
    ]);
    expect(result.contribution.roots).toEqual([ChartProvider.key]);
    expect(result.contribution.providers.map(provider => provider.key)).toEqual([
      SurfaceProvider.key,
      PathClipProvider.key,
      FlexLayoutProvider.key,
      { capability: 'shape', name: 'sector' },
      { capability: 'shape', name: 'contour' },
      { capability: 'pathKind', name: 'ribbon' },
      PlotProviderKey,
      ChartProvider.key,
    ]);
  });

  it('uses the stable default data reference for typed inputs and renders from one compile result', () => {
    const chart = createScatterChart({
      data: [{ income: 1000, life: 72 }],
      encoding: { x: { field: 'income' }, y: { field: 'life' } },
      title: 'Income and life expectancy',
    });
    expect(chart.input.plot).toMatchObject({ spec: chart.chart.plot });
    const rendered = renderChart(chart, { output: { width: 320, height: 200 } });

    expect(chart.chart.plot.data.reference).toBe('chart.data');
    expect(rendered.svg).toContain('<svg');
    expect(rendered.compileResult.scene.primitives).toHaveLength(1);
  });

  it('carries same-named Core, Chart, and Plot Theme definitions through typed SSR', () => {
    const chart = createScatterChart({
      data: [{ income: 1000, life: 72 }],
      encoding: { x: { field: 'income' }, y: { field: 'life' } },
      theme: { style: 'brand' },
      themeStyles: [brandCoreTheme],
      chartThemeStyles: [brandChartTheme],
      plotThemeStyles: [brandPlotTheme],
    });

    const rendered = renderChart(chart, { output: { width: 320, height: 200 } });

    expect(rendered.svg).toContain('#f0f9ff');
  });

  it('applies Core compile options supplied to renderChart before rendering its single result', () => {
    const chart = createChart({
      plot: { spec: plot },
      datasets: { countries: [] },
      title: 'Income and life expectancy',
      theme: { style: 'brand' },
      chartThemeStyles: [brandChartTheme],
      lowerOptions: { plotThemeStyles: [brandPlotTheme] },
    });

    const rendered = renderChart(chart, {
      compile: { themeStyles: [brandCoreTheme] },
      output: { width: 320, height: 200 },
    });

    expect(rendered.svg).toContain('<svg');
  });

  it('fails loudly instead of silently discarding a compile driver', () => {
    const chart = createScatterChart({
      data: [{ income: 1000, life: 72 }],
      encoding: { x: { field: 'income' }, y: { field: 'life' } },
    });
    const compileDriver = { create: () => undefined };

    expect(() => Reflect.apply(renderChart, undefined, [chart, { compileDriver }])).toThrow(
      'Vanilla compile drivers require authored IR or a plain figure spec',
    );
  });

  it('keeps a typed creation Theme after ChartAuthoringResult crosses a value boundary', () => {
    const chart = createConnectedScatterChart({
      data: [
        { income: 1000, life: 72 },
        { income: 2000, life: 75 },
      ],
      encoding: { x: { field: 'income' }, y: { field: 'life' }, order: 'income' },
      theme: { style: 'brand' },
      themeStyles: [brandCoreTheme],
      chartThemeStyles: [brandChartTheme],
      plotThemeStyles: [brandPlotTheme],
    });

    const original = renderChart(chart, { output: { width: 320, height: 200 } });
    const copied = renderChart({ ...chart }, { output: { width: 320, height: 200 } });

    expect(original.svg).toContain('#7c3aed');
    expect(copied.svg).toBe(original.svg);
  });
});
