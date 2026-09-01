import { PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { normalizePlot, normalizePlotDeclarations } from '../../../src';

describe('normalizePlot', () => {
  it('保留显式 ratio domain padding', () => {
    const spec = normalizePlot({
      data: { reference: 'sales' },
      scales: [
        {
          type: 'linear',
          name: 'x',
          domainPadding: { kind: 'ratio', lower: 0.1, upper: 0.2 },
        },
      ],
      marks: [],
    });

    expect(spec.scales).toContainEqual({
      type: 'linear',
      name: 'x',
      domainPadding: { kind: 'ratio', lower: 0.1, upper: 0.2 },
    });
  });

  it('从 plain authoring input 创建 schema-valid IRPlot 并保留显式 identity', () => {
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

    const spec = normalizePlot(input);

    expect(spec).toMatchObject({
      namespace: 'plot',
      type: 'plot',
      id: 'sales',
      marks: [{ id: 'points' }],
      guides: [{ id: 'revenue-axis' }],
    });
    expect(() => PlotSchema.parse(spec)).not.toThrow();
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

    const spec = normalizePlot(input);

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

  it('保留 Plot-only facet template、panel coordinate 与 view id template', () => {
    const spec = normalizePlot({
      data: { reference: 'sales' },
      scales: [],
      coordinate: { type: 'cartesian2D', x: 'xScale', y: 'yScale' },
      facets: [
        {
          id: 'region',
          row: 'region',
          view: 'regionTemplate',
          coordinate: {
            type: 'polar2D',
            angle: 'xScale',
            radius: 'yScale',
            startAngle: 0,
            endAngle: 360,
            innerRadius: 0,
          },
          viewIdTemplate: '{arrangement}.panel.{row}.{column}',
          empty: 'show',
          header: { row: false },
          resolve: { scale: { x: 'shared' } },
          spacing: { panelGap: 8 },
        },
      ],
      marks: [{ type: 'point', facetId: 'region', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
    });

    expect(spec.composition).toEqual({
      defaultView: 'regionTemplate',
      views: [{ id: 'regionTemplate', coordinate: { type: 'cartesian2D', x: 'xScale', y: 'yScale' } }],
      arrangements: [
        {
          kind: 'facet',
          id: 'region',
          view: 'regionTemplate',
          row: { field: 'region' },
          empty: 'show',
          header: { row: false },
          resolve: { scale: { x: 'shared' } },
          spacing: { panelGap: 8 },
          coordinate: {
            type: 'polar2D',
            angle: 'xScale',
            radius: 'yScale',
            startAngle: 0,
            endAngle: 360,
            innerRadius: 0,
          },
          viewIdTemplate: '{arrangement}.panel.{row}.{column}',
        },
      ],
    });
  });

  it('按 authored order 合并多个 facet composition 并使用首个 template view', () => {
    const spec = normalizePlot({
      data: { reference: 'sales' },
      scales: [],
      coordinate: { type: 'cartesian2D', x: 'xScale', y: 'yScale' },
      facets: [
        { id: 'region', row: 'region', view: 'regionTemplate' },
        { id: 'channel', column: 'channel', view: 'channelTemplate' },
      ],
      marks: [{ type: 'point', facetId: 'channel', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
    });

    expect(spec.composition).toMatchObject({
      defaultView: 'regionTemplate',
      views: [{ id: 'regionTemplate' }, { id: 'channelTemplate' }],
      arrangements: [
        { kind: 'facet', id: 'region', view: 'regionTemplate' },
        { kind: 'facet', id: 'channel', view: 'channelTemplate' },
      ],
    });
    expect(spec.marks[0]).toMatchObject({ coordinateView: 'channelTemplate' });
  });

  it('让 plain input 与 declaration facet 产出同一 composition', () => {
    const facet = {
      id: 'sales',
      row: 'channel',
      column: { field: 'region', order: ['north', 'south'] },
      view: 'salesTemplate',
      spacing: { panelGap: 10 },
    };
    const plain = normalizePlot({
      data: { reference: 'sales' },
      scales: [],
      facets: [facet],
      marks: [],
    });
    const declaration = normalizePlotDeclarations(
      {
        declarations: [{ kind: 'facet', props: facet, path: [0] }],
        runtimeSources: [],
      },
      { data: { reference: 'sales' }, mode: 'plot-root' },
    );

    expect(declaration.fragment.composition).toEqual(plain.composition);
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

    const first = normalizePlot(input);
    const second = normalizePlot(input);

    expect(first).toEqual(second);
    expect(first.composition?.arrangements?.[0]).toMatchObject({ kind: 'tracks', id: 'ops' });
    expect(input).toEqual(snapshot);
  });

  it('拒绝显式 composition 与 topology sugar 混用', () => {
    expect(() =>
      normalizePlot({
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
