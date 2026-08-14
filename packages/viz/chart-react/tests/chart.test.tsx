import type { IRPlotSpec } from '@retikz/plot';

import { ChartProvider, defineChartThemeStyle } from '@retikz/chart';
import { ChartInputEmbedAdapter } from '@retikz/chart-vanilla';
import { PointChartInputEmbedAdapter } from '@retikz/chart-vanilla/point';
import { defineThemeStyle } from '@retikz/core';
import { definePlotThemeStyle, getDefaultPlotThemePreset, PlotProviderKey } from '@retikz/plot';
import { Layout, Scope, Text } from '@retikz/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

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

/** 读取 React Chart 组件交给唯一 Vanilla adapter 的 authoring 输入 */
const inputOf = <TInput,>(
  component: { createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => TInput },
  props: Readonly<Record<string, unknown>>,
): TInput => component.createInputEmbedProps(props);

/** 创建 Chart Vanilla adapter 的嵌入上下文 */
const contextOf = (id: string) => ({
  id,
  kind: 'chart',
  layerId: 'default',
  identityPath: ['default', id],
});

describe('<Chart>', () => {
  it('normalizes marker order through the base Chart Vanilla adapter', () => {
    const input = inputOf(Chart, {
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
    const contribution = ChartInputEmbedAdapter.lower(input, contextOf('income-life'));

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
    expect(contribution.providerDependencies.roots).toEqual([ChartProvider.key]);
    expect(contribution.providerDependencies.providers.map(provider => provider.key)).toMatchObject([
      { namespace: 'standard', type: 'surface' },
      { namespace: 'layout', type: 'flexLayout' },
      PlotProviderKey,
      ChartProvider.key,
    ]);
  });

  it('uses marker text as a whole-preset override of its shorthand', () => {
    const input = inputOf(Chart, {
      spec: plot,
      data: { countries: [] },
      title: 'Ignored shorthand',
      children: <ChartTitle>Marker title</ChartTitle>,
    });

    expect(input).not.toHaveProperty('chart');
    expect(input.plot).not.toHaveProperty('namespace');
    expect(input.plot).not.toHaveProperty('type');
    expect(ChartInputEmbedAdapter.lower(input, contextOf('income-life')).node).toMatchObject({
      presentation: { children: [{ preset: 'title', text: 'Marker title' }, { key: 'chart.plot' }] },
    });
  });

  it('preserves separate Text children as styled presentation lines', () => {
    const input = inputOf(Chart, {
      spec: plot,
      data: { countries: [] },
      children: (
        <ChartSubtitle>
          <Text font={{ weight: 'bold' }}>2007 countries</Text>
          <Text fill="gray">GDP per capita and life expectancy</Text>
        </ChartSubtitle>
      ),
    });

    expect(ChartInputEmbedAdapter.lower(input, contextOf('income-life')).node).toMatchObject({
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

  it('routes typed input to the Point Chart Vanilla adapter with its stable data reference', () => {
    const input = inputOf(ScatterChart, {
      data: [{ income: 1000, life: 72 }],
      encoding: { x: { field: 'income' }, y: { field: 'life' } },
      title: 'Income and life expectancy',
    });
    const contribution = PointChartInputEmbedAdapter.lower(input, contextOf('income-life'));

    expect(contribution.node).toMatchObject({
      namespace: 'chart',
      type: 'chart',
      plot: { data: { reference: 'chart.data' } },
      presentation: { children: [{ preset: 'title' }, { key: 'chart.plot' }] },
    });
    expect(contribution.providerDependencies.roots).toEqual([ChartProvider.key]);
  });

  it('keeps Layout host props out of the typed Chart Vanilla input', () => {
    const input = inputOf(ScatterChart, {
      data: [{ income: 1000, life: 72 }],
      encoding: { x: { field: 'income' }, y: { field: 'life' } },
      animate: false,
      snapshotAt: 120,
      runtime: { mode: 'static' },
      animationRef: { current: null },
      onArtifacts: () => undefined,
      onCompileResult: () => undefined,
    });

    expect(input.input).not.toHaveProperty('runtime');
    expect(input.input).not.toHaveProperty('animate');
    expect(input.input).not.toHaveProperty('snapshotAt');
    expect(input.input).not.toHaveProperty('animationRef');
    expect(input.input).not.toHaveProperty('onArtifacts');
    expect(input.input).not.toHaveProperty('onCompileResult');
  });

  it('keeps Core Theme resolution in the enclosing Vanilla processing context', () => {
    const input = inputOf(ScatterChart, {
      data: [{ income: 1000, life: 72 }],
      encoding: { x: { field: 'income' }, y: { field: 'life' } },
      theme: { style: 'brand' },
      themeStyles: [brandCoreTheme],
      chartThemeStyles: [brandChartTheme],
      plotThemeStyles: [brandPlotTheme],
    });

    expect(PointChartInputEmbedAdapter.lower(input, contextOf('income-life'))).toMatchObject({
      node: { type: 'scope', children: [{ namespace: 'chart', type: 'chart' }] },
      providerDependencies: { roots: [ChartProvider.key] },
    });
  });

  it('resolves typed recipe topology from an enclosing Scope Theme through real Layout SSR', () => {
    const markup = renderToStaticMarkup(
      <Layout themeStyles={[brandCoreTheme]} runtime={{ mode: 'static' }}>
        <Scope theme={{ style: 'brand' }}>
          <ScatterChart
            data={[{ income: 1000, life: 72 }]}
            encoding={{ x: { field: 'income' }, y: { field: 'life' } }}
            chartThemeStyles={[brandChartTheme]}
            plotThemeStyles={[brandPlotTheme]}
          />
        </Scope>
      </Layout>,
    );

    expect(markup).toContain('#f0f9ff');
    expect(markup).toContain('#7c3aed');
  });

  it('keeps an outer id on Chart when root transforms wrap the complete result', () => {
    const input = inputOf(Chart, {
      spec: plot,
      data: { countries: [] },
      id: 'sales',
      x: 10,
    });
    const contribution = ChartInputEmbedAdapter.lower(input, contextOf('sales'));

    expect(contribution.node).toMatchObject({
      type: 'scope',
      transforms: [{ kind: 'translate', x: 10, y: 0 }],
      children: [{ namespace: 'chart', type: 'chart', id: 'sales' }],
    });
    expect(contribution.node).not.toHaveProperty('id');
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
