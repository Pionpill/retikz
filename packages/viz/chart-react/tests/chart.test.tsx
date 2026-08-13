import type { IRPlotSpec } from '@retikz/plot';

import { ChartProvider, defineChartThemeStyle } from '@retikz/chart';
import { compileToScene, DEFAULT_RESOLVED_THEME, defineThemeStyle, resolveCompositeDependencies } from '@retikz/core';
import { FlexLayoutProvider } from '@retikz/layout';
import { getDefaultPlotThemePreset, PlotProviderKey } from '@retikz/plot';
import { definePlotThemeStyle } from '@retikz/plot';
import { buildIRWithContributions, Layout, Scope, Text } from '@retikz/react';
import { SurfaceProvider } from '@retikz/standard';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { ChartHostProps } from '../src';

import { getDefaultChartThemePreset } from '../../chart/src/base/style';
import { Chart, ChartNote, ChartSource, ChartSubtitle, ChartTitle } from '../src';
import { ScatterChart } from '../src/point';

const brandCoreTheme = defineThemeStyle({
  name: 'brand',
  resolve: () => ({
    semantic: { error: '#aa0000', success: '#00aa00', warning: '#aaaa00' },
    categorical: ['#112233'],
  }),
});

const brandChartTheme = defineChartThemeStyle({
  name: 'brand',
  resolve: theme => ({
    ...getDefaultChartThemePreset(theme.mode),
    'chart.canvas.fill': theme.mode === 'dark' ? '#111111' : '#f0f9ff',
    'chart.axis.enabled': false,
    'chart.axis.grid.enabled': false,
  }),
});

const brandPlotTheme = definePlotThemeStyle({
  name: 'brand',
  resolve: theme => ({
    tokens: { ...getDefaultPlotThemePreset(theme.mode), 'plot.palette.series': ['#7c3aed'] },
    tokenRules: [],
  }),
});

const plot: IRPlotSpec = {
  namespace: 'plot',
  type: 'plot',
  id: 'income-life',
  data: { reference: 'countries' },
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [{ type: 'point', encoding: { x: { field: 'income' }, y: { field: 'life' } } }],
};

const hostProps: Required<Pick<ChartHostProps, 'animate' | 'snapshotAt' | 'runtime'>> & ChartHostProps = {
  animate: false,
  snapshotAt: 120,
  runtime: { mode: 'static' },
  animationRef: { current: null },
  onArtifacts: () => undefined,
  onCompileResult: () => undefined,
};

describe('<Chart>', () => {
  it('normalizes marker order and contributes only the canonical Chart root', () => {
    const contribution = Chart.embeddableAdapter.contribute({
      spec: plot,
      data: { countries: [] },
      title: 'Income and life expectancy',
      children: (
        <>
          <ChartSubtitle>2023 estimates</ChartSubtitle>
          <ChartTitle font={{ size: 20 }}>Income and life expectancy</ChartTitle>
          <ChartSource>World Bank</ChartSource>
          <ChartNote>Income is PPP-adjusted USD</ChartNote>
        </>
      ),
    });

    expect(contribution.node).toMatchObject({
      namespace: 'chart',
      type: 'chart',
      plot,
      presentation: {
        children: [
          { key: 'chart.presentation.subtitle', preset: 'subtitle' },
          { key: 'chart.presentation.title', preset: 'title', text: 'Income and life expectancy', font: { size: 20 } },
          { key: 'chart.plot' },
          { key: 'chart.presentation.source', preset: 'source' },
          { key: 'chart.presentation.note', preset: 'note' },
        ],
      },
    });
    expect(contribution.compositeDependencies.roots).toEqual([ChartProvider.key]);
    expect(contribution.compositeDependencies.providers.map(provider => provider.key)).toEqual([
      SurfaceProvider.key,
      FlexLayoutProvider.key,
      PlotProviderKey,
      ChartProvider.key,
    ]);
  });

  it('uses marker text as a whole-preset override of its shorthand', () => {
    const contribution = Chart.embeddableAdapter.contribute({
      spec: plot,
      data: { countries: [] },
      title: 'Ignored shorthand',
      children: <ChartTitle>Marker title</ChartTitle>,
    });

    expect(contribution.node).toMatchObject({
      presentation: { children: [{ preset: 'title', text: 'Marker title' }, { key: 'chart.plot' }] },
    });
  });

  it('preserves separate Text children as styled presentation lines', () => {
    const contribution = Chart.embeddableAdapter.contribute({
      spec: plot,
      data: { countries: [] },
      children: (
        <ChartSubtitle>
          <Text font={{ weight: 'bold' }}>2007 countries</Text>
          <Text fill="gray">GDP per capita and life expectancy</Text>
        </ChartSubtitle>
      ),
    });

    expect(contribution.node).toMatchObject({
      presentation: {
        children: [
          {
            preset: 'subtitle',
            text: [
              { text: '2007 countries', font: { weight: 'bold' } },
              { text: 'GDP per capita and life expectancy', fill: 'gray' },
            ],
          },
          { key: 'chart.plot' },
        ],
      },
    });
  });

  it('resolves typed input through the same canonical root with a stable data reference', () => {
    const contribution = ScatterChart.embeddableAdapter.contribute({
      data: [{ income: 1000, life: 72 }],
      encoding: { x: { field: 'income' }, y: { field: 'life' } },
      title: 'Income and life expectancy',
    });

    expect(contribution.node).toMatchObject({
      namespace: 'chart',
      type: 'chart',
      plot: { data: { reference: 'chart.data' } },
      presentation: { children: [{ preset: 'title' }, { key: 'chart.plot' }] },
    });
    expect(contribution.compositeDependencies.roots).toEqual([ChartProvider.key]);
  });

  it('accepts every shared Layout host prop without leaking it into the embedded Chart recipe', () => {
    const contribution = ScatterChart.embeddableAdapter.contribute({
      data: [{ income: 1000, life: 72 }],
      encoding: { x: { field: 'income' }, y: { field: 'life' } },
      ...hostProps,
    });

    expect(contribution.node).toMatchObject({ namespace: 'chart', type: 'chart' });
    expect(contribution.node).not.toHaveProperty('runtime');
    expect(contribution.node).not.toHaveProperty('animate');
  });

  it('resolves typed recipe topology from its local standalone Theme before it creates the Chart root', () => {
    const markup = renderToStaticMarkup(
      <ScatterChart
        data={[{ income: 1000, life: 72 }]}
        encoding={{ x: { field: 'income' }, y: { field: 'life' } }}
        theme={{ style: 'brand' }}
        themeStyles={[brandCoreTheme]}
        chartThemeStyles={[brandChartTheme]}
        plotThemeStyles={[brandPlotTheme]}
        runtime={{ mode: 'static' }}
      />,
    );

    expect(markup).toContain('#f0f9ff');
    expect(markup).toContain('#7c3aed');
  });

  it('requires an enclosing Layout to provide Core Theme definitions for an embedded typed Chart', () => {
    expect(() =>
      ScatterChart.embeddableAdapter.contribute({
        data: [{ income: 1000, life: 72 }],
        encoding: { x: { field: 'income' }, y: { field: 'life' } },
        theme: { style: 'brand' },
        themeStyles: [brandCoreTheme],
        chartThemeStyles: [brandChartTheme],
        plotThemeStyles: [brandPlotTheme],
      }),
    ).toThrow(/theme style/i);
  });

  it('resolves typed recipe topology from an enclosing Scope Theme before the embedded adapter creates the Chart root', () => {
    const built = buildIRWithContributions(
      <Scope theme={{ style: 'brand' }}>
        <ScatterChart
          data={[{ income: 1000, life: 72 }]}
          encoding={{ x: { field: 'income' }, y: { field: 'life' } }}
          chartThemeStyles={[brandChartTheme]}
          plotThemeStyles={[brandPlotTheme]}
        />
      </Scope>,
      undefined,
      undefined,
      { theme: DEFAULT_RESOLVED_THEME, themeStyles: [brandCoreTheme] },
    );

    expect(built.ir.children).toMatchObject([
      {
        type: 'scope',
        theme: { style: 'brand' },
        children: [
          {
            namespace: 'chart',
            type: 'chart',
            plot: { guides: [] },
          },
        ],
      },
    ]);
  });

  it('keeps an outer id on Chart when root transforms wrap the complete result', () => {
    const contribution = Chart.embeddableAdapter.contribute({
      spec: plot,
      data: { countries: [] },
      id: 'sales',
      x: 10,
    });
    const warnings: Array<{ code: string }> = [];
    const composites = resolveCompositeDependencies({ contributions: [contribution.compositeDependencies] });

    expect(contribution.node).toMatchObject({
      type: 'scope',
      transforms: [{ kind: 'translate', x: 10, y: 0 }],
      children: [{ namespace: 'chart', type: 'chart', id: 'sales' }],
    });
    expect(contribution.node).not.toHaveProperty('id');

    compileToScene(
      { version: 1, type: 'scene', children: [contribution.node] },
      { composites, onWarn: warning => warnings.push(warning) },
    );
    expect(warnings.filter(warning => warning.code === 'DUPLICATE_NODE_ID')).toHaveLength(0);
  });
});

it('inherits Theme definitions through a real Layout before typed recipe resolution and keeps a child mode override', () => {
  const markup = renderToStaticMarkup(
    <Layout theme={{ style: 'brand' }} themeStyles={[brandCoreTheme]} runtime={{ mode: 'static' }}>
      <ScatterChart
        data={[{ income: 1000, life: 72 }]}
        encoding={{ x: { field: 'income' }, y: { field: 'life' } }}
        theme={{ mode: 'dark' }}
        chartThemeStyles={[brandChartTheme]}
        plotThemeStyles={[brandPlotTheme]}
      />
    </Layout>,
  );

  expect(markup).toContain('#111111');
  expect(markup).toContain('#7c3aed');
});
