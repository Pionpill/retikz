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
        defaultScope: 'main',
        scopes: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'x', y: 'y' } }],
      },
    })
      .point({ type: 'point', coordinateScope: 'main', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } })
      .axis({ type: 'axis', dimension: 'y', coordinateScope: 'main', title: 'Revenue' })
      .build();

    expect(built.coordinate).toBeUndefined();
    expect(built.marks[0]).toMatchObject({ type: 'point', coordinateScope: 'main' });
    expect(built.guides?.[0]).toMatchObject({ type: 'axis', coordinateScope: 'main', title: 'Revenue' });
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
        defaultScope: 'main',
        scopes: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'x', y: 'y' } }],
      },
    })
      .point({ type: 'point', coordinateScope: 'main', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } })
      .axis({
        type: 'axis',
        dimension: 'y',
        coordinateScope: 'main',
        grid: { applyTo: AxisGridApplyTo.Selected, select: { scopes: ['main'] } },
      })
      .build();

    expect(built.guides?.[0]).toMatchObject({
      type: 'axis',
      dimension: 'y',
      grid: { applyTo: 'selected', select: { scopes: ['main'] } },
    });
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
      defaultScope: 'default',
      scopes: [
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
      { type: 'path', coordinateScope: 'temperature' },
      { type: 'path', coordinateScope: 'rainfall' },
    ]);
    expect(JSON.stringify(built)).not.toContain('yAxisId');
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
      defaultScope: 'default',
      scopes: [
        { id: 'default', coordinate: { y: '__y.default' } },
        { id: 'rainfall', coordinate: { y: '__y.rainfall' }, placement: { kind: 'overlay', target: 'default' } },
      ],
    });
    expect(built.marks).toMatchObject([
      { type: 'path', coordinateScope: 'default' },
      { type: 'point', coordinateScope: 'default' },
      { type: 'path', coordinateScope: 'rainfall' },
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
        layout: { trackGap: 24, axisGap: 8, labelGap: 6 },
        guidePolicy: { gridPlacement: 'sharedRole', trackLabels: 'inline' },
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
      defaultScope: 'incidents',
      scaffolds: [
        {
          id: 'ops',
          coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
          sharedRoles: ['x'],
          tracks: [
            { id: 'incidents', band: { role: 'y', start: 0, end: 0.42 } },
            { id: 'load', band: { role: 'y', start: 0.58, end: 1 } },
          ],
        },
      ],
      scopes: [
        { id: 'incidents', placement: { kind: 'track', scaffold: 'ops', track: 'incidents' } },
        { id: 'load', placement: { kind: 'track', scaffold: 'ops', track: 'load' } },
      ],
      layout: { trackGap: 24, axisGap: 8, labelGap: 6 },
      guidePolicy: { gridPlacement: 'sharedRole', trackLabels: 'inline' },
    });
    expect(built.marks).toMatchObject([
      { type: 'path', coordinateScope: 'incidents' },
      { type: 'path', coordinateScope: 'load' },
    ]);
    expect(built.guides).toMatchObject([
      { type: 'axis', coordinateScope: 'incidents' },
      { type: 'axis', coordinateScope: 'load' },
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
        scales: { roles: { y: 'shared' } },
        layout: { panelGap: 24, axisGap: 8, labelGap: 6 },
        guidePolicy: { axes: 'outerShared', gridPlacement: 'self', facetLabels: 'rowColumn' },
      })
      .path({ type: 'path', facetId: 'sales', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } })
      .axis({ type: 'axis', facetId: 'sales', dimension: 'y', grid: true })
      .build();

    expect(built.composition).toEqual({
      defaultScope: 'salesPanel',
      scopes: [{ id: 'salesPanel', coordinate: { type: 'cartesian2D', x: '__x', y: '__y' } }],
      facets: [
        {
          id: 'sales',
          row: { field: 'channel', order: ['online', 'store'] },
          column: { field: 'region', order: ['north', 'south', 'west'] },
          scales: { roles: { y: 'shared' } },
        },
      ],
      layout: { panelGap: 24, axisGap: 8, labelGap: 6 },
      guidePolicy: { axes: 'outerShared', gridPlacement: 'self', facetLabels: 'rowColumn' },
    });
    expect(built.marks[0]).toMatchObject({ type: 'path', coordinateScope: 'salesPanel' });
    expect(built.guides?.[0]).toMatchObject({ type: 'axis', coordinateScope: 'salesPanel', grid: true });
    expect(JSON.stringify(built)).not.toContain('facetId');
    expect(() => PlotSpecSchema.parse(built)).not.toThrow();
  });
});
