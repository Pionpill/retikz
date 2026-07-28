import { describe, expect, it } from 'vitest';

import { createPlotSpec, PlotSpecSchema } from '../../../src';

describe('createPlotSpec', () => {
  it('从 plain authoring input 创建 schema-valid PlotSpec 并保留显式 identity', () => {
    const input = {
      id: 'sales',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear' as const, name: 'x' },
        { type: 'linear' as const, name: 'y' },
      ],
      coordinate: { type: 'cartesian2D' as const, x: 'x', y: 'y' },
      marks: [
        {
          type: 'point' as const,
          id: 'points',
          encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
        },
      ],
      guides: [{ type: 'axis' as const, id: 'revenue-axis', dimension: 'y' as const }],
    };
    const snapshot = structuredClone(input);

    const spec = createPlotSpec(input);

    expect(spec).toMatchObject({
      namespace: 'plot',
      type: 'plot',
      id: 'sales',
      marks: [{ id: 'points' }],
      guides: [{ id: 'revenue-axis' }],
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
    expect(input).toEqual(snapshot);
  });

  it('展开 facet sugar 且不修改嵌套输入', () => {
    const input = {
      data: { reference: 'sales' },
      scales: [],
      facets: [{ id: 'sales', row: 'channel', column: { field: 'region', order: ['north', 'south'] } }],
      marks: [
        {
          type: 'path' as const,
          facetId: 'sales',
          encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
        },
      ],
      guides: [{ type: 'axis' as const, facetId: 'sales', dimension: 'y' as const, grid: true }],
    };
    const snapshot = structuredClone(input);

    const spec = createPlotSpec(input);

    expect(spec.composition).toEqual({
      defaultView: 'salesPanel',
      views: [{ id: 'salesPanel', coordinate: { type: 'cartesian2D', x: '__x', y: '__y' } }],
      arrangements: [
        {
          kind: 'facet',
          id: 'sales',
          view: 'salesPanel',
          row: { field: 'channel' },
          column: { field: 'region', order: ['north', 'south'] },
        },
      ],
    });
    expect(spec.marks[0]).toMatchObject({ type: 'path', coordinateView: 'salesPanel' });
    expect(spec.guides?.[0]).toMatchObject({ type: 'axis', coordinateView: 'salesPanel' });
    expect(JSON.stringify(spec)).not.toContain('facetId');
    expect(input).toEqual(snapshot);
  });

  it('重复展开 nested scaffold input 时保持输入不变且输出稳定', () => {
    const input = {
      data: { reference: 'ops' },
      scales: [],
      scaffolds: [
        {
          id: 'ops',
          sharedRoles: ['x' as const],
          coordinate: { type: 'cartesian2D' as const },
          tracks: [
            { id: 'incidents', band: { role: 'y' as const, start: 0, end: 0.42 } },
            { id: 'load', band: { role: 'y' as const, start: 0.58, end: 1 } },
          ],
        },
      ],
      marks: [
        {
          type: 'path' as const,
          trackId: 'load',
          encoding: { x: { field: 'week' }, y: { field: 'load' } },
        },
      ],
      guides: [{ type: 'axis' as const, scaffoldId: 'ops', dimension: 'x' as const }],
    };
    const snapshot = structuredClone(input);

    const first = createPlotSpec(input);
    const second = createPlotSpec(input);

    expect(first).toEqual(second);
    expect(first.composition?.arrangements?.[0]).toMatchObject({ kind: 'tracks', id: 'ops' });
    expect(input).toEqual(snapshot);
  });

  it('拒绝显式 composition 与 topology sugar 混用', () => {
    expect(() =>
      createPlotSpec({
        data: { reference: 'sales' },
        scales: [],
        composition: {
          defaultView: 'main',
          views: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'x', y: 'y' } }],
        },
        facets: [{ id: 'sales', row: 'region' }],
        marks: [
          {
            type: 'point',
            facetId: 'sales',
            encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
          },
        ],
      }),
    ).toThrow(/plot authoring:.*composition.*facet.*scaffold/i);
  });
});
