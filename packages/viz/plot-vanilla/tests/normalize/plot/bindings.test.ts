import { describe, expect, expectTypeOf, it } from 'vitest';

import type { InputPlotMark } from '../../../src';

import { normalizePlotBindings } from '../../../src/normalize/plot/bindings';

describe('normalizePlotBindings', () => {
  it('把多 y 轴绑定展开为稳定 overlay composition', () => {
    const normalized = normalizePlotBindings({
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
        { type: 'axis', id: 'temperature', dimension: 'y' },
        { type: 'axis', id: 'rainfall', dimension: 'y', grid: true },
      ],
      scales: [],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      facets: [],
      scaffolds: [],
    });

    expect(normalized.composition).toEqual({
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
    expect(normalized.scales).toEqual([
      { type: 'linear', name: '__x' },
      { type: 'linear', name: '__y.default' },
      { type: 'linear', name: '__y.temperature' },
      { type: 'linear', name: '__y.rainfall' },
    ]);
    expect(normalized.marks).toMatchObject([
      { type: 'path', coordinateView: 'temperature' },
      { type: 'path', coordinateView: 'rainfall' },
    ]);
    expect(JSON.stringify(normalized)).not.toContain('yAxisId');
  });

  it('把多 x 轴绑定展开为稳定 overlay composition', () => {
    const normalized = normalizePlotBindings({
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
        { type: 'axis', id: 'elapsed', dimension: 'x' },
        { type: 'axis', id: 'date', dimension: 'x' },
        { type: 'axis', dimension: 'y' },
      ],
      scales: [],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      facets: [],
      scaffolds: [],
    });

    expect(normalized.composition).toEqual({
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
    expect(normalized.scales).toEqual([
      { type: 'linear', name: '__x.default' },
      { type: 'linear', name: '__x.elapsed' },
      { type: 'linear', name: '__x.date' },
      { type: 'linear', name: '__y' },
    ]);
    expect(normalized.marks).toMatchObject([
      { type: 'path', coordinateView: 'elapsed' },
      { type: 'point', coordinateView: 'date' },
    ]);
  });

  it('使用显式 coordinate scale 名展开多轴 scale', () => {
    const normalized = normalizePlotBindings({
      marks: [
        {
          type: 'point',
          xAxisId: 'elapsed',
          encoding: { x: { field: 'elapsedAt' }, y: { field: 'value' } },
        },
        {
          type: 'path',
          yAxisId: 'rainfall',
          encoding: { x: { field: 'recordedAt' }, y: { field: 'rainfall' } },
        },
      ],
      guides: [
        { type: 'axis', id: 'elapsed', dimension: 'x' },
        { type: 'axis', id: 'rainfall', dimension: 'y' },
      ],
      scales: [
        { type: 'time', name: 'time', clamp: true },
        { type: 'log', name: 'value', base: 2 },
      ],
      coordinate: { type: 'cartesian2D', x: 'time', y: 'value' },
      facets: [],
      scaffolds: [],
    });

    expect(normalized.composition).toEqual({
      defaultView: 'default',
      views: [
        { id: 'default', coordinate: { type: 'cartesian2D', x: 'time.default', y: 'value.default' } },
        {
          id: 'elapsed',
          coordinate: { type: 'cartesian2D', x: 'time.elapsed', y: 'value.default' },
          placement: { kind: 'overlay', target: 'default' },
        },
        {
          id: 'rainfall',
          coordinate: { type: 'cartesian2D', x: 'time.default', y: 'value.rainfall' },
          placement: { kind: 'overlay', target: 'default' },
        },
      ],
    });
    expect(normalized.scales).toEqual([
      { type: 'time', name: 'time.default', clamp: true },
      { type: 'time', name: 'time.elapsed', clamp: true },
      { type: 'log', name: 'value.default', base: 2 },
      { type: 'log', name: 'value.rainfall', base: 2 },
    ]);
  });

  it('在 x/y 共用显式 scale 时只生成一个默认轴 scale', () => {
    const normalized = normalizePlotBindings({
      marks: [
        { type: 'point', xAxisId: 'top', encoding: { x: { field: 'x' }, y: { field: 'y' } } },
        { type: 'path', yAxisId: 'right', encoding: { x: { field: 'x' }, y: { field: 'value' } } },
      ],
      guides: [
        { type: 'axis', id: 'top', dimension: 'x' },
        { type: 'axis', id: 'right', dimension: 'y' },
      ],
      scales: [{ type: 'linear', name: 'shared', clamp: true }],
      coordinate: { type: 'cartesian2D', x: 'shared', y: 'shared' },
      facets: [],
      scaffolds: [],
    });

    expect(normalized.scales).toEqual([
      { type: 'linear', name: 'shared.default', clamp: true },
      { type: 'linear', name: 'shared.top', clamp: true },
      { type: 'linear', name: 'shared.right', clamp: true },
    ]);
    expect(normalized.composition).toEqual({
      defaultView: 'default',
      views: [
        { id: 'default', coordinate: { type: 'cartesian2D', x: 'shared.default', y: 'shared.default' } },
        {
          id: 'top',
          coordinate: { type: 'cartesian2D', x: 'shared.top', y: 'shared.default' },
          placement: { kind: 'overlay', target: 'default' },
        },
        {
          id: 'right',
          coordinate: { type: 'cartesian2D', x: 'shared.default', y: 'shared.right' },
          placement: { kind: 'overlay', target: 'default' },
        },
      ],
    });
  });

  it('把省略与显式 default 的 mark 绑定到默认 scope', () => {
    const normalized = normalizePlotBindings({
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
      scales: [],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      facets: [],
      scaffolds: [],
    });

    expect(normalized.marks).toMatchObject([
      { type: 'path', coordinateView: 'default' },
      { type: 'point', coordinateView: 'default' },
      { type: 'path', coordinateView: 'rainfall' },
    ]);
  });

  it('把 shared scaffold 绑定展开为 tracks composition', () => {
    const normalized = normalizePlotBindings({
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
      scales: [],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      facets: [],
      scaffolds: [
        {
          id: 'ops',
          sharedRoles: ['x'],
          tracks: [
            { id: 'incidents', band: { role: 'y', start: 0, end: 0.42 } },
            { id: 'load', band: { role: 'y', start: 0.58, end: 1 } },
          ],
        },
      ],
    });

    expect(normalized.composition).toEqual({
      defaultView: 'incidents',
      arrangements: [
        {
          kind: 'tracks',
          id: 'ops',
          coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
          sharedRoles: ['x'],
          tracks: [
            { id: 'incidents', view: 'incidents', band: { role: 'y', start: 0, end: 0.42 } },
            { id: 'load', view: 'load', band: { role: 'y', start: 0.58, end: 1 } },
          ],
        },
      ],
    });
    expect(normalized.guides).toMatchObject([
      { type: 'axis', coordinateView: 'incidents' },
      { type: 'axis', coordinateView: 'load' },
    ]);
    expect(normalized.marks).toEqual([
      {
        type: 'path',
        coordinateView: 'incidents',
        encoding: { x: { field: 'week' }, y: { field: 'incidents' } },
      },
      {
        type: 'path',
        coordinateView: 'load',
        encoding: { x: { field: 'week' }, y: { field: 'load' } },
      },
    ]);
    expect(JSON.stringify(normalized)).not.toMatch(/scaffoldId|trackId/);
  });

  it('按 scaffold viewIdTemplate 派生 mark 与 guide 的 coordinate view', () => {
    const normalized = normalizePlotBindings({
      marks: [
        {
          type: 'path',
          trackId: 'load',
          encoding: { x: { field: 'week' }, y: { field: 'load' } },
        },
      ],
      guides: [
        { type: 'axis', trackId: 'incidents', dimension: 'y' },
        { type: 'axis', scaffoldId: 'ops', dimension: 'x' },
      ],
      scales: [],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      facets: [],
      scaffolds: [
        {
          id: 'ops',
          sharedRoles: ['x'],
          viewIdTemplate: '{arrangement}.panel.{track}',
          tracks: [
            { id: 'load', band: { role: 'y', start: 0, end: 0.42 } },
            { id: 'incidents', view: 'manual.incidents', band: { role: 'y', start: 0.58, end: 1 } },
          ],
        },
      ],
    });

    expect(normalized.composition).toEqual({
      defaultView: 'ops.panel.load',
      arrangements: [
        {
          kind: 'tracks',
          id: 'ops',
          coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
          sharedRoles: ['x'],
          viewIdTemplate: '{arrangement}.panel.{track}',
          tracks: [
            { id: 'load', view: 'ops.panel.load', band: { role: 'y', start: 0, end: 0.42 } },
            { id: 'incidents', view: 'manual.incidents', band: { role: 'y', start: 0.58, end: 1 } },
          ],
        },
      ],
    });
    expect(normalized.marks).toMatchObject([{ type: 'path', coordinateView: 'ops.panel.load' }]);
    expect(normalized.guides).toMatchObject([
      { type: 'axis', coordinateView: 'manual.incidents' },
      { type: 'axis', coordinateView: 'ops.panel.load' },
    ]);
  });

  it('拒绝同时声明 facet 与 scaffold', () => {
    expect(() =>
      normalizePlotBindings({
        marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
        guides: [],
        scales: [],
        coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
        facets: [{ id: 'sales', row: 'region' }],
        scaffolds: [
          {
            id: 'ops',
            sharedRoles: ['x'],
            tracks: [{ id: 'load', band: { role: 'y', start: 0, end: 1 } }],
          },
        ],
      }),
    ).toThrow(/plot authoring:.*facets and scaffolds cannot be mixed/i);
  });

  it.each([
    { type: 'reference', encoding: { y: { value: 0 } }, yAxisId: 'right' },
    {
      type: 'relation',
      source: { markId: 'source' },
      target: { markId: 'target' },
      yAxisId: 'right',
    },
    { type: 'heatmap', xAxisId: 'top', intensity: 0.8 },
  ])('拒绝在非 position mark $type 上使用 axis binding', mark => {
    expect(() =>
      normalizePlotBindings({
        marks: [mark as unknown as InputPlotMark],
        guides: [
          { type: 'axis', id: 'top', dimension: 'x' },
          { type: 'axis', id: 'right', dimension: 'y' },
        ],
        scales: [],
        coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
        facets: [],
        scaffolds: [],
      }),
    ).toThrow(/plot authoring:.*axis binding is only supported on path, point, and interval marks/i);
  });

  it.each([
    { type: 'reference', encoding: { y: { value: 0 } }, xAxisId: undefined },
    {
      type: 'relation',
      source: { markId: 'source' },
      target: { markId: 'target' },
      yAxisId: undefined,
    },
    { type: 'heatmap', xAxisId: undefined, intensity: 0.8 },
  ])('拒绝非 position mark $type 显式持有 undefined axis binding 字段', mark => {
    expect(() =>
      normalizePlotBindings({
        marks: [mark as unknown as InputPlotMark],
        guides: [],
        scales: [],
        coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
        facets: [],
        scaffolds: [],
      }),
    ).toThrow(/plot authoring:.*axis binding is only supported on path, point, and interval marks/i);
  });

  it('只为 position mark 暴露 axis binding 类型', () => {
    expectTypeOf<Extract<InputPlotMark, { type: 'point' }>>().toMatchObjectType<{
      xAxisId?: string;
      yAxisId?: string;
    }>();
    expectTypeOf<Extract<InputPlotMark, { type: 'reference' }>['xAxisId']>().toEqualTypeOf<undefined>();
    expectTypeOf<Extract<InputPlotMark, { type: 'reference' }>['yAxisId']>().toEqualTypeOf<undefined>();
  });

  it('对多种 binding mode 使用统一错误前缀', () => {
    expect(() =>
      normalizePlotBindings({
        marks: [
          {
            type: 'point',
            yAxisId: 'right',
            facetId: 'sales',
            encoding: { x: { field: 'x' }, y: { field: 'y' } },
          },
        ],
        guides: [{ type: 'axis', id: 'right', dimension: 'y' }],
        scales: [],
        coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
        facets: [{ id: 'sales', row: 'region' }],
        scaffolds: [],
      }),
    ).toThrow(/plot authoring:.*multiple binding props/i);
  });

  it('对缺失或维度错误的 axis id fail-loud', () => {
    expect(() =>
      normalizePlotBindings({
        marks: [
          {
            type: 'path',
            yAxisId: 'rainfall',
            encoding: { x: { field: 'day' }, y: { field: 'rainfall' } },
          },
        ],
        guides: [{ type: 'axis', id: 'rainfall', dimension: 'x' }],
        scales: [],
        coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
        facets: [],
        scaffolds: [],
      }),
    ).toThrow(/plot authoring:.*yAxisId.*dimension "y"/i);
  });

  it('拒绝跨 mark 混用 axis 与 topology binding mode', () => {
    expect(() =>
      normalizePlotBindings({
        marks: [
          { type: 'point', yAxisId: 'right', encoding: { x: { field: 'x' }, y: { field: 'y' } } },
          { type: 'point', facetId: 'sales', encoding: { x: { field: 'x' }, y: { field: 'value' } } },
        ],
        guides: [{ type: 'axis', id: 'right', dimension: 'y' }],
        scales: [],
        coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
        facets: [{ id: 'sales', row: 'region' }],
        scaffolds: [],
      }),
    ).toThrow(/plot authoring:.*multiple binding modes/i);
  });

  it('拒绝重复的 facet、scaffold 与跨 scaffold track id', () => {
    const base = {
      marks: [{ type: 'point' as const, encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
      guides: [],
      scales: [],
      coordinate: { type: 'cartesian2D' as const, x: '__x', y: '__y' },
    };
    expect(() =>
      normalizePlotBindings({
        ...base,
        facets: [
          { id: 'sales', row: 'region' },
          { id: 'sales', column: 'channel' },
        ],
        scaffolds: [],
      }),
    ).toThrow(/plot authoring:.*duplicate facet id/i);
    expect(() =>
      normalizePlotBindings({
        ...base,
        facets: [],
        scaffolds: [
          { id: 'ops', sharedRoles: ['x'], tracks: [{ id: 'first', band: { role: 'y', start: 0, end: 1 } }] },
          { id: 'ops', sharedRoles: ['x'], tracks: [{ id: 'second', band: { role: 'y', start: 0, end: 1 } }] },
        ],
      }),
    ).toThrow(/plot authoring:.*duplicate scaffold id/i);
    expect(() =>
      normalizePlotBindings({
        ...base,
        facets: [],
        scaffolds: [
          { id: 'first', sharedRoles: ['x'], tracks: [{ id: 'shared', band: { role: 'y', start: 0, end: 1 } }] },
          { id: 'second', sharedRoles: ['x'], tracks: [{ id: 'shared', band: { role: 'y', start: 0, end: 1 } }] },
        ],
      }),
    ).toThrow(/plot authoring:.*duplicate track id/i);
  });
});
