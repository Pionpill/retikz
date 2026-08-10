import { AxisGridApplyTo, PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { plot } from '../src';

describe('plot', () => {
  it('组装 composition、mark 与 guide 为 plain PlotSpec', () => {
    const spec = plot({
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      composition: {
        defaultView: 'main',
        views: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'x', y: 'y' } }],
      },
      marks: [
        {
          type: 'point',
          coordinateView: 'main',
          encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
        },
      ],
      guides: [{ type: 'axis', dimension: 'y', coordinateView: 'main', title: 'Revenue' }],
    });

    expect(spec.coordinate).toBeUndefined();
    expect(spec.marks[0]).toMatchObject({ type: 'point', coordinateView: 'main' });
    expect(spec.guides?.[0]).toMatchObject({ type: 'axis', coordinateView: 'main', title: 'Revenue' });
    expect('build' in spec).toBe(false);
    expect('mark' in spec).toBe(false);
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('透传 axis grid selector', () => {
    const spec = plot({
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      composition: {
        defaultView: 'main',
        views: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'x', y: 'y' } }],
      },
      marks: [
        {
          type: 'point',
          coordinateView: 'main',
          encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
        },
      ],
      guides: [
        {
          type: 'axis',
          dimension: 'y',
          coordinateView: 'main',
          grid: { applyTo: AxisGridApplyTo.Selected, select: { view: ['main'] } },
        },
      ],
    });

    expect(spec.guides?.[0]).toMatchObject({
      type: 'axis',
      dimension: 'y',
      grid: { applyTo: 'selected', select: { view: ['main'] } },
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('透传 theme 与 legend style', () => {
    const spec = plot({
      data: { reference: 'cities' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      plotTheme: {
        background: '#ffffff',
        palette: { categorical: ['#2563eb', '#dc2626'], sequential: 'magma' },
        legend: { swatchSize: 12, label: { textColor: '#475569' } },
      },
      marks: [
        {
          type: 'point',
          encoding: { x: { field: 'lng' }, y: { field: 'lat' }, color: { field: 'region' } },
        },
      ],
      guides: [
        {
          type: 'legend',
          channel: 'color',
          title: ['Region', { text: 'n = 42', font: { size: 10 }, opacity: 0.72 }],
          ticks: { count: 4 },
          tickLabels: { format: '~s' },
          style: { swatchSize: 10, title: { font: { weight: 600 } } },
        },
      ],
    });

    expect(spec.plotTheme).toMatchObject({
      background: '#ffffff',
      palette: { categorical: ['#2563eb', '#dc2626'], sequential: 'magma' },
      legend: { swatchSize: 12, label: { textColor: '#475569' } },
    });
    expect(spec.guides?.[0]).toMatchObject({
      type: 'legend',
      channel: 'color',
      ticks: { count: 4 },
      tickLabels: { format: '~s' },
      style: { swatchSize: 10, title: { font: { weight: 600 } } },
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('透传 Plot plotThemeTokens', () => {
    const spec = plot({
      data: { reference: 'sales' },
      scales: [],
      coordinate: { type: 'cartesian2D' },
      plotThemeTokens: { 'plot.palette.series': ['#2563eb'] },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
    });
    expect(spec.plotThemeTokens).toEqual({ 'plot.palette.series': ['#2563eb'] });
  });

  it('展开 yAxisId binding sugar 为 overlay composition', () => {
    const spec = plot({
      data: { reference: 'weather' },
      scales: [],
      marks: [
        {
          type: 'path',
          yAxisId: 'temperature',
          encoding: { x: { field: 'day' }, y: { field: 'temperature' } },
        },
        {
          type: 'path',
          yAxisId: 'rainfall',
          encoding: { x: { field: 'day' }, y: { field: 'rainfall' } },
        },
      ],
      guides: [
        { type: 'axis', dimension: 'x', title: 'day' },
        { type: 'axis', id: 'temperature', dimension: 'y', placement: { kind: 'side', side: 'left' } },
        { type: 'axis', id: 'rainfall', dimension: 'y', placement: { kind: 'side', side: 'right' }, grid: true },
      ],
    });

    expect(spec.coordinate).toBeUndefined();
    expect(spec.composition).toEqual({
      defaultView: 'default',
      views: [
        { id: 'default', coordinate: { type: 'cartesian2D', x: '__x', y: '__y.default' } },
        {
          id: 'temperature',
          coordinate: { type: 'cartesian2D', x: '__x', y: '__y.temperature' },
          placement: { kind: 'overlay', target: 'default' },
        },
        {
          id: 'rainfall',
          coordinate: { type: 'cartesian2D', x: '__x', y: '__y.rainfall' },
          placement: { kind: 'overlay', target: 'default' },
        },
      ],
    });
    expect(spec.scales).toEqual([
      { type: 'linear', name: '__x' },
      { type: 'linear', name: '__y.default' },
      { type: 'linear', name: '__y.temperature' },
      { type: 'linear', name: '__y.rainfall' },
    ]);
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateView: 'temperature' },
      { type: 'path', coordinateView: 'rainfall' },
    ]);
    expect(JSON.stringify(spec)).not.toContain('yAxisId');
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('展开 xAxisId binding sugar 为 overlay composition', () => {
    const spec = plot({
      data: { reference: 'schedule' },
      scales: [],
      marks: [
        {
          type: 'path',
          xAxisId: 'elapsed',
          encoding: { x: { field: 'elapsedDay' }, y: { field: 'revenue' } },
        },
        {
          type: 'point',
          xAxisId: 'date',
          encoding: { x: { field: 'dateIndex' }, y: { field: 'revenue' } },
        },
      ],
      guides: [
        { type: 'axis', id: 'elapsed', dimension: 'x', placement: { kind: 'side', side: 'bottom' } },
        { type: 'axis', id: 'date', dimension: 'x', placement: { kind: 'side', side: 'top' } },
        { type: 'axis', dimension: 'y', title: 'revenue' },
      ],
    });

    expect(spec.coordinate).toBeUndefined();
    expect(spec.composition).toEqual({
      defaultView: 'default',
      views: [
        { id: 'default', coordinate: { type: 'cartesian2D', x: '__x.default', y: '__y' } },
        {
          id: 'elapsed',
          coordinate: { type: 'cartesian2D', x: '__x.elapsed', y: '__y' },
          placement: { kind: 'overlay', target: 'default' },
        },
        {
          id: 'date',
          coordinate: { type: 'cartesian2D', x: '__x.date', y: '__y' },
          placement: { kind: 'overlay', target: 'default' },
        },
      ],
    });
    expect(spec.scales).toEqual([
      { type: 'linear', name: '__x.default' },
      { type: 'linear', name: '__x.elapsed' },
      { type: 'linear', name: '__x.date' },
      { type: 'linear', name: '__y' },
    ]);
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateView: 'elapsed' },
      { type: 'point', coordinateView: 'date' },
    ]);
    expect(JSON.stringify(spec)).not.toContain('xAxisId');
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('把省略或 default yAxisId 的 mark 绑定到默认 scope', () => {
    const spec = plot({
      data: { reference: 'weather' },
      scales: [],
      marks: [
        {
          type: 'path',
          yAxisId: 'default',
          encoding: { x: { field: 'day' }, y: { field: 'temperature' } },
        },
        { type: 'point', encoding: { x: { field: 'day' }, y: { field: 'label' } } },
        {
          type: 'path',
          yAxisId: 'rainfall',
          encoding: { x: { field: 'day' }, y: { field: 'rainfall' } },
        },
      ],
      guides: [{ type: 'axis', id: 'rainfall', dimension: 'y' }],
    });

    expect(spec.composition).toMatchObject({
      defaultView: 'default',
      views: [
        { id: 'default', coordinate: { y: '__y.default' } },
        { id: 'rainfall', coordinate: { y: '__y.rainfall' }, placement: { kind: 'overlay', target: 'default' } },
      ],
    });
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateView: 'default' },
      { type: 'point', coordinateView: 'default' },
      { type: 'path', coordinateView: 'rainfall' },
    ]);
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('拒绝缺失的 y axis binding', () => {
    expect(() =>
      plot({
        data: { reference: 'weather' },
        scales: [],
        marks: [
          {
            type: 'path',
            yAxisId: 'rainfall',
            encoding: { x: { field: 'day' }, y: { field: 'rainfall' } },
          },
        ],
        guides: [{ type: 'axis', id: 'temperature', dimension: 'y' }],
      }),
    ).toThrow(/missing.*y axis/i);
  });

  it('展开 track binding sugar 为 shared scaffold composition', () => {
    const spec = plot({
      data: { reference: 'ops' },
      scales: [],
      scaffolds: [
        {
          id: 'ops',
          sharedRoles: ['x'],
          spacing: { trackGap: 24, axisGap: 8, labelGap: 6 },
          resolve: { grid: { x: 'all', y: 'all' } },
          tracks: [
            { id: 'incidents', band: { role: 'y', start: 0, end: 0.42 } },
            { id: 'load', band: { role: 'y', start: 0.58, end: 1 } },
          ],
        },
      ],
      marks: [
        {
          type: 'path',
          trackId: 'incidents',
          encoding: { x: { field: 'week' }, y: { field: 'incidents' } },
        },
        {
          type: 'path',
          trackId: 'load',
          encoding: { x: { field: 'week' }, y: { field: 'load' } },
        },
      ],
      guides: [
        { type: 'axis', scaffoldId: 'ops', dimension: 'x', grid: true },
        { type: 'axis', trackId: 'load', dimension: 'y' },
      ],
    });

    expect(spec.composition).toEqual({
      defaultView: 'incidents',
      arrangements: [
        {
          kind: 'tracks',
          id: 'ops',
          coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
          sharedRoles: ['x'],
          spacing: { trackGap: 24, axisGap: 8, labelGap: 6 },
          resolve: { grid: { x: 'all', y: 'all' } },
          tracks: [
            { id: 'incidents', view: 'incidents', band: { role: 'y', start: 0, end: 0.42 } },
            { id: 'load', view: 'load', band: { role: 'y', start: 0.58, end: 1 } },
          ],
        },
      ],
    });
    expect(spec.scales).toEqual([
      { type: 'linear', name: '__x' },
      { type: 'linear', name: '__y' },
    ]);
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateView: 'incidents' },
      { type: 'path', coordinateView: 'load' },
    ]);
    expect(spec.guides).toMatchObject([
      { type: 'axis', coordinateView: 'incidents' },
      { type: 'axis', coordinateView: 'load' },
    ]);
    expect(JSON.stringify(spec)).not.toMatch(/trackId|scaffoldId/);
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('展开 facet binding sugar 为 facet composition', () => {
    const spec = plot({
      data: { reference: 'sales' },
      scales: [],
      facets: [
        {
          id: 'sales',
          row: { field: 'channel', order: ['online', 'store'] },
          column: { field: 'region', order: ['north', 'south', 'west'] },
          resolve: { scale: { y: 'shared' }, axis: { x: 'outer', y: 'outer' }, grid: { x: 'local', y: 'local' } },
          header: { row: true, column: true },
          spacing: { panelGap: 24, axisGap: 8, labelGap: 6 },
        },
      ],
      marks: [
        {
          type: 'path',
          facetId: 'sales',
          encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
        },
      ],
      guides: [{ type: 'axis', facetId: 'sales', dimension: 'y', grid: true }],
    });

    expect(spec.composition).toEqual({
      defaultView: 'salesPanel',
      views: [{ id: 'salesPanel', coordinate: { type: 'cartesian2D', x: '__x', y: '__y' } }],
      arrangements: [
        {
          kind: 'facet',
          id: 'sales',
          view: 'salesPanel',
          row: { field: 'channel', order: ['online', 'store'] },
          column: { field: 'region', order: ['north', 'south', 'west'] },
          header: { row: true, column: true },
          spacing: { panelGap: 24, axisGap: 8, labelGap: 6 },
          resolve: { scale: { y: 'shared' }, axis: { x: 'outer', y: 'outer' }, grid: { x: 'local', y: 'local' } },
        },
      ],
    });
    expect(spec.scales).toEqual([
      { type: 'linear', name: '__x' },
      { type: 'linear', name: '__y' },
    ]);
    expect(spec.marks[0]).toMatchObject({ type: 'path', coordinateView: 'salesPanel' });
    expect(spec.guides?.[0]).toMatchObject({ type: 'axis', coordinateView: 'salesPanel', grid: true });
    expect(JSON.stringify(spec)).not.toContain('facetId');
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });
});
