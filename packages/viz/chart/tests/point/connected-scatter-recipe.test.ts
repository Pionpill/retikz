import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { resolvePlotTheme } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import type { ChartRecipeStyleContext } from '../../src/point/recipe';

import { resolveChartStyle } from '../../src/base/style';
import { ConnectedScatterChartRecipe, ConnectedScatterChartSchema } from '../../src/point/connected-scatter';
import { pointChartRecipeStyleContextOf } from '../../src/point/recipe';

const visibleStyle: ChartRecipeStyleContext = {
  axisEnabled: true,
  axisGridEnabled: true,
  legendEnabled: true,
  seriesColor: '#475569',
};

const connectedScatter = (overrides: Record<string, unknown> = {}) =>
  ConnectedScatterChartSchema.parse({
    namespace: 'chart',
    type: 'connected-scatter',
    id: 'journey',
    data: { reference: 'rows' },
    encoding: { x: { field: 'amount' }, y: { field: 'margin' }, order: 'month' },
    ...overrides,
  });

const connectionAndPoints = (overrides: Record<string, unknown> = {}, style = visibleStyle) => {
  const seed = ConnectedScatterChartRecipe.createSeed(connectedScatter(overrides), style);
  return { seed, connection: seed.plot.marks[0], points: seed.plot.marks[1] };
};

describe('Connected Scatter Chart recipe', () => {
  it('builds an open ordered Path before Point with shared position and view ownership', () => {
    const { seed, connection, points } = connectionAndPoints();

    expect(connection).toEqual({
      type: 'path',
      id: '__chart.connected-scatter.mark.connection',
      order: 'month',
      closed: false,
      stroke: { kind: 'constant', value: '#475569' },
      encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
    });
    expect(points).toEqual({
      type: 'point',
      id: '__chart.connected-scatter.mark.points',
      color: { kind: 'constant', value: '#475569' },
      encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
    });
    expect(seed.members.map(member => member.target)).toEqual([
      'scale.x',
      'scale.y',
      'coordinate.main',
      'mark.connection',
      'mark.points',
      'guide.x',
      'guide.y',
    ]);
  });

  it('maps an explicit constant to Point color and Path stroke without a color scale or legend', () => {
    const { seed, connection, points } = connectionAndPoints({
      encoding: {
        x: { field: 'amount' },
        y: { field: 'margin' },
        order: 'month',
        series: 'region',
        color: { value: '#dc2626' },
      },
    });

    expect(points).toMatchObject({ color: { kind: 'constant', value: '#dc2626' } });
    expect(connection).toMatchObject({
      series: 'region',
      stroke: { kind: 'constant', value: '#dc2626' },
      encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
    });
    expect(seed.plot.scales).toHaveLength(2);
    expect(seed.plot.guides?.some(guide => guide.type === 'legend')).toBe(false);
  });

  it('maps an unscaled field to one reserved ordinal scale and bound default legend', () => {
    const { seed, connection, points } = connectionAndPoints({
      encoding: {
        x: { field: 'amount' },
        y: { field: 'margin' },
        order: 'month',
        color: { field: 'group' },
      },
    });

    expect(points).toMatchObject({
      color: {
        kind: 'field',
        value: 'group',
        scale: '__chart.connected-scatter.scale.color',
      },
    });
    expect(connection).toMatchObject({
      series: 'group',
      encoding: {
        color: { field: 'group', scale: '__chart.connected-scatter.scale.color' },
      },
    });
    expect(seed.plot.scales).toContainEqual({
      type: 'ordinal',
      name: '__chart.connected-scatter.scale.color',
    });
    expect(seed.plot.guides).toContainEqual({
      type: 'legend',
      channel: 'color',
      scale: '__chart.connected-scatter.scale.color',
    });
  });

  it('preserves one authored field scale and explicit series grouping', () => {
    const { seed, connection, points } = connectionAndPoints({
      encoding: {
        x: { field: 'amount' },
        y: { field: 'margin' },
        order: 'month',
        series: 'region',
        color: { field: 'group', scale: 'authoredColor' },
      },
      scales: [{ type: 'ordinal', name: 'authoredColor', range: ['#ef4444', '#3b82f6'] }],
    });

    expect(points).toMatchObject({
      color: { kind: 'field', value: 'group', scale: 'authoredColor' },
    });
    expect(connection).toMatchObject({
      series: 'region',
      encoding: { color: { field: 'group', scale: 'authoredColor' } },
    });
    expect(seed.plot.scales.some(scale => scale.name === 'authoredColor')).toBe(false);
    expect(seed.plot.guides).toContainEqual({ type: 'legend', channel: 'color', scale: 'authoredColor' });
  });

  it('maps series-only color through one reserved ordinal scale and legend', () => {
    const { seed, connection, points } = connectionAndPoints({
      encoding: {
        x: { field: 'amount' },
        y: { field: 'margin' },
        order: 'month',
        series: 'region',
      },
    });

    expect(points).toMatchObject({
      color: {
        kind: 'field',
        value: 'region',
        scale: '__chart.connected-scatter.scale.series-color',
      },
    });
    expect(connection).toMatchObject({
      series: 'region',
      encoding: {
        color: { field: 'region', scale: '__chart.connected-scatter.scale.series-color' },
      },
    });
    expect(seed.plot.scales).toContainEqual({
      type: 'ordinal',
      name: '__chart.connected-scatter.scale.series-color',
    });
    expect(seed.plot.guides).toContainEqual({
      type: 'legend',
      channel: 'color',
      scale: '__chart.connected-scatter.scale.series-color',
    });
  });

  it('omits the default legend when topology disables it or authored guides replace defaults', () => {
    const disabled = connectionAndPoints(
      {
        encoding: {
          x: { field: 'amount' },
          y: { field: 'margin' },
          order: 'month',
          color: { field: 'group' },
        },
      },
      { ...visibleStyle, legendEnabled: false },
    ).seed;
    const authored = connectionAndPoints({
      encoding: {
        x: { field: 'amount' },
        y: { field: 'margin' },
        order: 'month',
        color: { field: 'group' },
      },
      guides: [{ type: 'axis', id: 'authored-axis', dimension: 'x' }],
    }).seed;

    expect(disabled.plot.guides?.some(guide => guide.type === 'legend')).toBe(false);
    expect(authored.plot.guides?.some(guide => guide.type === 'legend')).toBe(false);
  });

  it('applies Point color and connection stroke patches after recipe color defaults', () => {
    const { seed } = connectionAndPoints({
      encoding: {
        x: { field: 'amount' },
        y: { field: 'margin' },
        order: 'month',
        color: { value: '#2563eb' },
      },
      mark: { color: { kind: 'constant', value: '#dc2626' } },
      components: { connection: { stroke: { kind: 'constant', value: '#16a34a' }, curve: 'basis' } },
    });

    expect(seed.patches).toEqual([
      {
        target: 'mark.connection',
        inputPath: ['components', 'connection'],
        changes: [
          { path: ['curve'], value: 'basis' },
          { path: ['stroke'], value: { kind: 'constant', value: '#16a34a' } },
        ],
      },
      {
        target: 'mark.points',
        inputPath: ['mark'],
        changes: [{ path: ['color'], value: { kind: 'constant', value: '#dc2626' } }],
      },
    ]);
  });

  it('uses the final style token and native theme cascade for the shared default color', () => {
    const spec = connectedScatter({
      plotThemeTokens: { 'plot.palette.series': ['#111111'] },
      plotTheme: { palette: { series: ['#333333'] } },
    });
    const effectiveTheme = {
      mode: ThemeMode.Light,
      colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
    } as const;
    const resolved = resolveChartStyle(effectiveTheme, spec);
    const plotTheme = resolvePlotTheme(effectiveTheme, {
      plotThemeTokens: spec.plotThemeTokens,
      plotTheme: spec.plotTheme,
    });
    const seriesColor = plotTheme.palette.series[0];

    expect(seriesColor).toBe('#333333');
    expect(pointChartRecipeStyleContextOf(resolved, seriesColor).seriesColor).toBe('#333333');
    expect(connectionAndPoints({}, { ...visibleStyle, seriesColor }).points).toMatchObject({
      color: { kind: 'constant', value: '#333333' },
    });
  });
});
