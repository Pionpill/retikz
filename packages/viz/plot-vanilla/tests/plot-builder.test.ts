import { AxisGridApplyTo, PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { plotBuilder } from '../src';

describe('plotBuilder', () => {
  it('assembles composition marks and guides as plain PlotSpec data', () => {
    const built = plotBuilder({
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      composition: {
        defaultView: 'main',
        views: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'x', y: 'y' } }],
      },
    })
      .point({ type: 'point', coordinateView: 'main', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } })
      .axis({ type: 'axis', dimension: 'y', coordinateView: 'main', title: 'Revenue' })
      .build();

    expect(built.coordinate).toBeUndefined();
    expect(built.marks[0]).toMatchObject({ type: 'point', coordinateView: 'main' });
    expect(built.guides?.[0]).toMatchObject({ type: 'axis', coordinateView: 'main', title: 'Revenue' });
    expect(() => PlotSpecSchema.parse(built)).not.toThrow();
  });

  it('passes axis grid target selectors as plain PlotSpec data', () => {
    const built = plotBuilder({
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      composition: {
        defaultView: 'main',
        views: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'x', y: 'y' } }],
      },
    })
      .point({ type: 'point', coordinateView: 'main', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } })
      .axis({
        type: 'axis',
        dimension: 'y',
        coordinateView: 'main',
        grid: { applyTo: AxisGridApplyTo.Selected, select: { view: ['main'] } },
      })
      .build();

    expect(built.guides?.[0]).toMatchObject({
      type: 'axis',
      dimension: 'y',
      grid: { applyTo: 'selected', select: { view: ['main'] } },
    });
    expect(() => PlotSpecSchema.parse(built)).not.toThrow();
  });

  it('passes theme and legend style as plain PlotSpec data', () => {
    const built = plotBuilder({
      data: { reference: 'cities' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      theme: {
        background: '#ffffff',
        palette: { categorical: ['#2563eb', '#dc2626'], sequential: 'magma' },
        legend: { swatchSize: 12, label: { textColor: '#475569' } },
      },
    })
      .point({ type: 'point', encoding: { x: { field: 'lng' }, y: { field: 'lat' }, color: { field: 'region' } } })
      .legend({
        type: 'legend',
        channel: 'color',
        title: ['Region', { text: 'n = 42', font: { size: 10 }, opacity: 0.72 }],
        ticks: { count: 4 },
        tickLabels: { format: '~s' },
        style: { swatchSize: 10, title: { font: { weight: 600 } } },
      })
      .build();

    expect(built.theme).toMatchObject({
      background: '#ffffff',
      palette: { categorical: ['#2563eb', '#dc2626'], sequential: 'magma' },
      legend: { swatchSize: 12, label: { textColor: '#475569' } },
    });
    expect(built.guides?.[0]).toMatchObject({
      type: 'legend',
      channel: 'color',
      ticks: { count: 4 },
      tickLabels: { format: '~s' },
      style: { swatchSize: 10, title: { font: { weight: 600 } } },
    });
    expect(() => PlotSpecSchema.parse(built)).not.toThrow();
  });

  it('passes layout and labels as plain PlotSpec data', () => {
    const built = plotBuilder({
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      layout: { autoPadding: true },
      labels: [
        {
          type: 'text',
          role: 'title',
          text: 'Sales Overview',
          placement: { kind: 'side', side: 'top', placement: 'midway', padding: 8 },
        },
      ],
    })
      .path({ type: 'path', encoding: { x: { field: 'x' }, y: { field: 'y' } } })
      .axis({ type: 'axis', dimension: 'x' })
      .axis({ type: 'axis', dimension: 'y' })
      .build();

    expect(built.layout).toEqual({ autoPadding: true });
    expect(built.labels?.[0]).toMatchObject({ type: 'text', role: 'title', text: 'Sales Overview' });
    expect(() => PlotSpecSchema.parse(built)).not.toThrow();
  });

  it('expands yAxisId binding sugar into overlay composition', () => {
    const built = plotBuilder({ data: { reference: 'weather' }, scales: [] })
      .axis({ type: 'axis', dimension: 'x', title: 'day' })
      .axis({ type: 'axis', id: 'temperature', dimension: 'y', placement: { kind: 'side', side: 'left' } })
      .axis({ type: 'axis', id: 'rainfall', dimension: 'y', placement: { kind: 'side', side: 'right' }, grid: true })
      .path({
        type: 'path',
        yAxisId: 'temperature',
        encoding: { x: { field: 'day' }, y: { field: 'temperature' } },
      })
      .path({
        type: 'path',
        yAxisId: 'rainfall',
        encoding: { x: { field: 'day' }, y: { field: 'rainfall' } },
      })
      .build();

    expect(built.coordinate).toBeUndefined();
    expect(built.composition).toEqual({
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
    expect(built.scales).toEqual([
      { type: 'linear', name: '__x' },
      { type: 'linear', name: '__y.default' },
      { type: 'linear', name: '__y.temperature' },
      { type: 'linear', name: '__y.rainfall' },
    ]);
    expect(built.marks).toMatchObject([
      { type: 'path', coordinateView: 'temperature' },
      { type: 'path', coordinateView: 'rainfall' },
    ]);
    expect(JSON.stringify(built)).not.toContain('yAxisId');
    expect(() => PlotSpecSchema.parse(built)).not.toThrow();
  });

  it('expands xAxisId binding sugar into overlay composition', () => {
    const built = plotBuilder({ data: { reference: 'schedule' }, scales: [] })
      .axis({ type: 'axis', id: 'elapsed', dimension: 'x', placement: { kind: 'side', side: 'bottom' } })
      .axis({ type: 'axis', id: 'date', dimension: 'x', placement: { kind: 'side', side: 'top' } })
      .axis({ type: 'axis', dimension: 'y', title: 'revenue' })
      .path({
        type: 'path',
        xAxisId: 'elapsed',
        encoding: { x: { field: 'elapsedDay' }, y: { field: 'revenue' } },
      })
      .point({
        type: 'point',
        xAxisId: 'date',
        encoding: { x: { field: 'dateIndex' }, y: { field: 'revenue' } },
      })
      .build();

    expect(built.coordinate).toBeUndefined();
    expect(built.composition).toEqual({
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
    expect(built.scales).toEqual([
      { type: 'linear', name: '__x.default' },
      { type: 'linear', name: '__x.elapsed' },
      { type: 'linear', name: '__x.date' },
      { type: 'linear', name: '__y' },
    ]);
    expect(built.marks).toMatchObject([
      { type: 'path', coordinateView: 'elapsed' },
      { type: 'point', coordinateView: 'date' },
    ]);
    expect(JSON.stringify(built)).not.toContain('xAxisId');
    expect(() => PlotSpecSchema.parse(built)).not.toThrow();
  });

  it('binds omitted and default yAxisId marks to the dimension default scope', () => {
    const built = plotBuilder({ data: { reference: 'weather' }, scales: [] })
      .axis({ type: 'axis', id: 'rainfall', dimension: 'y' })
      .path({
        type: 'path',
        yAxisId: 'default',
        encoding: { x: { field: 'day' }, y: { field: 'temperature' } },
      })
      .point({ type: 'point', encoding: { x: { field: 'day' }, y: { field: 'label' } } })
      .path({
        type: 'path',
        yAxisId: 'rainfall',
        encoding: { x: { field: 'day' }, y: { field: 'rainfall' } },
      })
      .build();

    expect(built.composition).toMatchObject({
      defaultView: 'default',
      views: [
        { id: 'default', coordinate: { y: '__y.default' } },
        { id: 'rainfall', coordinate: { y: '__y.rainfall' }, placement: { kind: 'overlay', target: 'default' } },
      ],
    });
    expect(built.marks).toMatchObject([
      { type: 'path', coordinateView: 'default' },
      { type: 'point', coordinateView: 'default' },
      { type: 'path', coordinateView: 'rainfall' },
    ]);
    expect(() => PlotSpecSchema.parse(built)).not.toThrow();
  });

  it('rejects missing y axis bindings', () => {
    expect(() =>
      plotBuilder({ data: { reference: 'weather' }, scales: [] })
        .axis({ type: 'axis', id: 'temperature', dimension: 'y' })
        .path({
          type: 'path',
          yAxisId: 'rainfall',
          encoding: { x: { field: 'day' }, y: { field: 'rainfall' } },
        })
        .build(),
    ).toThrow(/missing.*y axis/i);
  });

  it('expands track binding sugar into shared scaffold composition', () => {
    const built = plotBuilder({ data: { reference: 'ops' }, scales: [] })
      .scaffold({
        id: 'ops',
        sharedRoles: ['x'],
        spacing: { trackGap: 24, axisGap: 8, labelGap: 6 },
        resolve: { grid: { x: 'all', y: 'all' } },
        tracks: [
          { id: 'incidents', band: { role: 'y', start: 0, end: 0.42 } },
          { id: 'load', band: { role: 'y', start: 0.58, end: 1 } },
        ],
      })
      .path({ type: 'path', trackId: 'incidents', encoding: { x: { field: 'week' }, y: { field: 'incidents' } } })
      .path({ type: 'path', trackId: 'load', encoding: { x: { field: 'week' }, y: { field: 'load' } } })
      .axis({ type: 'axis', scaffoldId: 'ops', dimension: 'x', grid: true })
      .axis({ type: 'axis', trackId: 'load', dimension: 'y' })
      .build();

    expect(built.composition).toEqual({
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
    expect(built.marks).toMatchObject([
      { type: 'path', coordinateView: 'incidents' },
      { type: 'path', coordinateView: 'load' },
    ]);
    expect(built.guides).toMatchObject([
      { type: 'axis', coordinateView: 'incidents' },
      { type: 'axis', coordinateView: 'load' },
    ]);
    expect(JSON.stringify(built)).not.toMatch(/trackId|scaffoldId/);
    expect(() => PlotSpecSchema.parse(built)).not.toThrow();
  });

  it('expands facet binding sugar into facet composition', () => {
    const built = plotBuilder({ data: { reference: 'sales' }, scales: [] })
      .facet({
        id: 'sales',
        row: { field: 'channel', order: ['online', 'store'] },
        column: { field: 'region', order: ['north', 'south', 'west'] },
        resolve: { scale: { y: 'shared' }, axis: { x: 'outer', y: 'outer' }, grid: { x: 'local', y: 'local' } },
        header: { row: true, column: true },
        spacing: { panelGap: 24, axisGap: 8, labelGap: 6 },
      })
      .path({ type: 'path', facetId: 'sales', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } })
      .axis({ type: 'axis', facetId: 'sales', dimension: 'y', grid: true })
      .build();

    expect(built.composition).toEqual({
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
    expect(built.marks[0]).toMatchObject({ type: 'path', coordinateView: 'salesPanel' });
    expect(built.guides?.[0]).toMatchObject({ type: 'axis', coordinateView: 'salesPanel', grid: true });
    expect(JSON.stringify(built)).not.toContain('facetId');
    expect(() => PlotSpecSchema.parse(built)).not.toThrow();
  });
});
