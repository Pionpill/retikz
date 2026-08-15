import type { IRCoordinate, IRNode, IRPath, IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import type { IRPlotSpec } from '../../../src/schemas';

import { definePathChannel } from '../../../src/contract';
import { lowerPlots } from '../../../src/pipeline/expand';
import { PlotSpecSchema } from '../../../src/schemas';

const opts: LowerPlotsOptions = { width: 200, height: 100 };

const extensionChannelsOf = (mark: {
  encoding?: { channels?: Partial<Record<string, { field?: string; value?: unknown }>> };
}): Partial<Record<string, { field?: string; value?: unknown }>> => mark.encoding?.channels ?? {};

const lineWeightChannel = definePathChannel<number>({
  channel: 'lineWeight',
  output: { outputKind: 'number', range: [1, 6] },
  resolve: () => mark => {
    const binding = extensionChannelsOf(mark).lineWeight;
    if (binding?.field === undefined) return undefined;
    const field = binding.field;
    return {
      resolver: row => {
        const value = Number(row[field]);
        return Number.isFinite(value) ? value : undefined;
      },
    };
  },
  deliver: (path, value) => {
    path.strokeWidth = value;
  },
});

const expandOf = (
  spec: IRPlotSpec,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: LowerPlotsOptions = opts,
): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec).children[0] as IRScope;
};

const markLayer = (root: IRScope, index: number): IRScope => root.children[index] as IRScope;

const collectPaths = (layer: IRScope): Array<IRPath> => {
  const out: Array<IRPath> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'path') out.push(node as IRPath);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

const collectRibbons = (layer: IRScope): Array<IRPath> => {
  const out: Array<IRPath> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; kind?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'path' && node.kind === 'ribbon') out.push(node as IRPath);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

const collectCoordinates = (layer: IRScope): Array<IRCoordinate> => {
  const out: Array<IRCoordinate> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'coordinate') out.push(node as IRCoordinate);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

const collectNodes = (layer: IRScope): Array<IRNode> => {
  const out: Array<IRNode> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'node') out.push(node as IRNode);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

const baseSpec = (marks: unknown): IRPlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x', domainPadding: 0 },
      { type: 'linear', name: 'y', domainPadding: 0 },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks,
  });

describe('RelationMark and anchorId lowering', () => {
  const rows = [
    { id: 'A', x: 0, y: 0, source: 'A', target: 'B', label: 'A to B' },
    { id: 'B', x: 1, y: 1, source: 'A', target: 'B', label: 'A to B' },
  ];

  it('accepts relation schema and rejects invalid anchorId / via-route combinations', () => {
    expect(() =>
      baseSpec([
        {
          type: 'relation',
          source: { id: 'A' },
          target: { id: 'B' },
          path: { options: { marks: [{ pos: 1, mark: { kind: 'arrow', length: 8 } }] } },
        },
      ]),
    ).not.toThrow();

    expect(() =>
      baseSpec([
        {
          type: 'relation',
          source: { id: 'A' },
          target: { id: 'B' },
          path: { options: { arrow: '->', arrowDetail: { end: { length: 8 } } } },
        },
      ]),
    ).toThrow();

    expect(() =>
      baseSpec([{ type: 'point', anchorId: { prefix: 'pt' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } }]),
    ).toThrow(/exactly one of field, template, or generator/);

    expect(() =>
      baseSpec([
        {
          type: 'relation',
          source: { id: 'A' },
          target: { id: 'B' },
          path: {
            via: [{ id: 'C' }],
            route: [{ kind: 'line' }],
          },
        },
      ]),
    ).toThrow(/cannot use via and route together/);
  });

  it('writes point anchorId to generated core Node ids', () => {
    const root = expandOf(
      baseSpec([
        { type: 'point', anchorId: { prefix: 'pt', field: 'id' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
      ]),
      { d: rows },
    );
    const layer = markLayer(root, 0);
    const ids = (layer.children as Array<{ id?: string }>).map(child => child.id);
    expect(ids).toEqual(['pt.A', 'pt.B']);
  });

  it('writes interval anchorId to generated core Node ids', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'interval',
          anchorId: { prefix: 'bar', field: 'id' },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ]),
      { d: rows },
    );
    expect(collectNodes(markLayer(root, 0)).map(node => node.id)).toEqual(['bar.A', 'bar.B']);
  });

  it('supports runtime anchorId generator keys without storing functions in the spec', () => {
    const root = expandOf(
      baseSpec([
        { type: 'point', anchorId: { generator: 'city' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
      ]),
      { d: rows },
      {
        ...opts,
        anchorIdGenerators: {
          city: row => `generated.${String(row.id).toLowerCase()}`,
        },
      },
    );
    const ids = (markLayer(root, 0).children as Array<{ id?: string }>).map(child => child.id);
    expect(ids).toEqual(['generated.a', 'generated.b']);
  });

  it('collects and resolves anchorId template field placeholders', () => {
    const root = expandOf(
      baseSpec([
        { type: 'point', anchorId: { template: 'pt.{field:id}' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
        {
          type: 'relation',
          source: { anchorId: { template: 'pt.{field:source}' } },
          target: { anchorId: { template: 'pt.{field:target}' } },
        },
      ]),
      { d: rows },
    );
    const [path] = collectPaths(markLayer(root, 1));
    expect(path.children[0]).toMatchObject({ kind: 'move', to: { id: 'pt.A' } });
    expect(path.children[1]).toMatchObject({ kind: 'line', to: { id: 'pt.B' } });
  });

  it('writes path anchorId as per-datum coordinates', () => {
    const root = expandOf(
      baseSpec([
        { type: 'path', anchorId: { prefix: 'way', field: 'id' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
      ]),
      { d: rows },
    );
    const coordinates = collectCoordinates(markLayer(root, 0));
    expect(coordinates.map(coordinate => coordinate.id)).toEqual(['way.A', 'way.B']);
  });

  it('lowers direct id source-target refs to core Path node targets', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'relation',
          source: { id: 'A', anchor: 'right' },
          target: { id: 'B', anchor: 'left' },
          path: { options: { marks: [{ pos: 1, mark: { kind: 'arrow', length: 10, width: 7 } }] } },
        },
      ]),
      { d: [rows[0]] },
    );
    const [path] = collectPaths(markLayer(root, 0));
    expect(path.marks).toEqual([{ pos: 1, mark: { kind: 'arrow', length: 10, width: 7 } }]);
    expect(path.children[0]).toMatchObject({ kind: 'move', to: { id: 'A', anchor: 'right' } });
    expect(path.children[1]).toMatchObject({ kind: 'line', to: { id: 'B', anchor: 'left' } });
  });

  it('lowers generated source-target anchors to a core Path with labels and path mark config', () => {
    const root = expandOf(
      baseSpec([
        { type: 'point', anchorId: { prefix: 'pt', field: 'id' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
        {
          type: 'relation',
          source: { anchorId: { prefix: 'pt', field: 'source' } },
          target: { anchorId: { prefix: 'pt', field: 'target' } },
          style: { color: { kind: 'constant', value: '#2563eb' } },
          path: {
            label: { text: { field: 'label' }, position: 'midway' },
            options: {
              marks: [
                { pos: 0.5, mark: { kind: 'arrow' } },
                { pos: 1, mark: { kind: 'arrow' } },
              ],
            },
          },
        },
      ]),
      { d: rows },
    );
    const [path] = collectPaths(markLayer(root, 1));
    expect(path.color).toBe('#2563eb');
    expect(path.marks).toEqual([
      { pos: 0.5, mark: { kind: 'arrow' } },
      { pos: 1, mark: { kind: 'arrow' } },
    ]);
    expect(path.children[0]).toMatchObject({ kind: 'move', to: { id: 'pt.A' } });
    expect(path.children[1]).toMatchObject({
      kind: 'line',
      to: { id: 'pt.B' },
      label: { text: 'A to B', sloped: true },
    });
  });

  it('defaults relation route labels to sloped and keeps explicit route step label before shorthand label', () => {
    const root = expandOf(
      baseSpec([
        { type: 'point', anchorId: { prefix: 'pt', field: 'id' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
        {
          type: 'relation',
          source: { anchorId: { prefix: 'pt', field: 'source' } },
          target: { anchorId: { prefix: 'pt', field: 'target' } },
          path: {
            route: [
              {
                kind: 'fold',
                via: '-|',
                to: { project: { x: 'x', y: 'y' } },
                label: { text: { field: 'label' }, position: 0.25 },
              },
              { kind: 'bend', bendDirection: 'left', bendAngle: 25 },
            ],
            label: { text: 'fallback' },
            options: { roundedCorners: 6 },
          },
        },
      ]),
      { d: rows },
    );
    const [path] = collectPaths(markLayer(root, 1));
    expect(path.roundedCorners).toBe(6);
    expect(path.children[1]).toMatchObject({ kind: 'fold', label: { text: 'A to B', position: 0.25, sloped: true } });
    expect(path.children[2]).toMatchObject({ kind: 'bend', bendDirection: 'left', bendAngle: 25 });
    expect('label' in path.children[2] ? path.children[2].label : undefined).toBeUndefined();
  });

  it('passes explicit relation label canonical side names', () => {
    const root = expandOf(
      baseSpec([
        { type: 'point', anchorId: { prefix: 'pt', field: 'id' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
        {
          type: 'relation',
          source: { anchorId: { prefix: 'pt', field: 'source' } },
          target: { anchorId: { prefix: 'pt', field: 'target' } },
          path: { label: { text: { field: 'label' }, side: 'top' } },
        },
      ]),
      { d: rows },
    );
    const [path] = collectPaths(markLayer(root, 1));
    expect(path.children[1]).toMatchObject({ kind: 'line', label: { text: 'A to B', side: 'top' } });
  });

  it('skips rows whose generated relation anchor fields are missing', () => {
    const root = expandOf(
      baseSpec([
        { type: 'point', anchorId: { prefix: 'pt', field: 'id' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
        {
          type: 'relation',
          source: { anchorId: { prefix: 'pt', field: 'source' }, boundary: true },
          target: { anchorId: { prefix: 'pt', field: 'target' }, boundary: true },
          path: { label: { text: { field: 'label' } } },
        },
      ]),
      {
        d: [
          { id: 'A', x: 0, y: 0 },
          { id: 'B', x: 1, y: 1 },
          { source: 'A', target: 'B', label: 'A to B' },
        ],
      },
    );
    const [path] = collectPaths(markLayer(root, 1));
    expect(collectPaths(markLayer(root, 1))).toHaveLength(1);
    expect(path.children[0]).toMatchObject({ kind: 'move', to: { id: 'pt.A', boundary: 'shape' } });
    expect(path.children[1]).toMatchObject({
      kind: 'line',
      to: { id: 'pt.B', boundary: 'shape' },
      label: { text: 'A to B' },
    });
  });

  it('generates coordinates for relation projected via waypoints', () => {
    const root = expandOf(
      baseSpec([
        { type: 'point', anchorId: { prefix: 'pt', field: 'id' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
        {
          type: 'relation',
          id: 'rel',
          source: { anchorId: { prefix: 'pt', field: 'source' } },
          target: { anchorId: { prefix: 'pt', field: 'target' } },
          path: { via: [{ project: { x: 'x', y: 'y' } }] },
        },
      ]),
      { d: rows },
    );
    const relationLayer = markLayer(root, 1);
    expect(collectCoordinates(relationLayer).map(coordinate => coordinate.id)).toEqual(['rel.0.via.0', 'rel.1.via.0']);
    expect(collectPaths(relationLayer)[0].children[1]).toMatchObject({ kind: 'line', to: { id: 'rel.0.via.0' } });
  });

  it('fails loud on duplicate anchor ids', () => {
    const spec = baseSpec([
      {
        type: 'point',
        anchorId: { prefix: 'pt', field: 'source' },
        encoding: { x: { field: 'x' }, y: { field: 'y' } },
      },
    ]);
    expect(() => expandOf(spec, { d: rows })).toThrow(/duplicate anchor id "pt.A"/);
  });

  it('fails loud on missing generated relation anchors after lowering', () => {
    const spec = baseSpec([
      { type: 'point', anchorId: { prefix: 'pt', field: 'id' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
      {
        type: 'relation',
        source: { anchorId: { prefix: 'pt', field: 'source' } },
        target: { anchorId: { prefix: 'pt', field: 'missing' } },
      },
    ]);
    expect(() => expandOf(spec, { d: [{ id: 'A', x: 0, y: 0, source: 'A', missing: 'Z' }] })).toThrow(/pt.Z/);
  });

  it('derives relation rows locally and connects generated anchor targets', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'path',
          anchorId: { prefix: 'trend', field: 'id' },
          encoding: { x: { field: 'x' }, y: { field: 'value' } },
        },
        {
          type: 'relation',
          transform: [
            {
              kind: 'relate',
              source: { selector: { kind: 'min', by: 'value' }, fields: { id: 'id' } },
              target: { selector: { kind: 'max', by: 'value' }, fields: { id: 'id' } },
              measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' }],
            },
          ],
          source: { anchorId: { prefix: 'trend', field: 'sourceId' } },
          target: { anchorId: { prefix: 'trend', field: 'targetId' } },
          path: {
            routing: { kind: 'bend', bendDirection: 'left', bendAngle: 20 },
            label: { text: { field: 'deltaLabel' }, position: 0.5 },
            options: { marks: [{ pos: 1, mark: { kind: 'arrow' } }] },
          },
        },
      ]),
      {
        d: [
          { id: 'a', x: 0, value: 14 },
          { id: 'b', x: 1, value: 5 },
          { id: 'c', x: 2, value: 29 },
        ],
      },
    );
    const [path] = collectPaths(markLayer(root, 1));
    expect(collectPaths(markLayer(root, 1))).toHaveLength(1);
    expect(path.marks).toEqual([{ pos: 1, mark: { kind: 'arrow' } }]);
    expect(path.children[0]).toMatchObject({ kind: 'move', to: { id: 'trend.b' } });
    expect(path.children[1]).toMatchObject({
      kind: 'bend',
      to: { id: 'trend.c' },
      bendDirection: 'left',
      bendAngle: 20,
      label: { text: '+24', position: 0.5, sloped: true },
    });
  });

  it('uses relation-local projected fields for scale domain and lowering', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'relation',
          transform: [
            {
              kind: 'relate',
              source: { selector: { kind: 'first' }, fields: { x: 'x', y: 'value' } },
              target: { selector: { kind: 'last' }, fields: { x: 'x', y: 'value' } },
            },
          ],
          source: { project: { x: 'sourceX', y: 'sourceY' } },
          target: { project: { x: 'targetX', y: 'targetY' } },
          path: { routing: { kind: 'line' } },
        },
      ]),
      {
        d: [
          { id: 'a', x: 10, value: 3 },
          { id: 'b', x: 30, value: 9 },
        ],
      },
    );
    const [path] = collectPaths(markLayer(root, 0));
    expect(path.children).toHaveLength(2);
    expect(path.children[0]).toMatchObject({ kind: 'move' });
    expect(path.children[1]).toMatchObject({ kind: 'line' });
  });

  it('lowers orthogonal routing to explicit line segments and attaches shorthand label to the main segment', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'relation',
          id: 'delta',
          transform: [
            {
              kind: 'relate',
              source: { selector: { kind: 'first' }, fields: { x: 'x', y: 'value' } },
              target: { selector: { kind: 'last' }, fields: { x: 'x', y: 'value' } },
              measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' }],
            },
          ],
          source: { project: { x: 'sourceX', y: 'sourceY' } },
          target: { project: { x: 'targetX', y: 'targetY' } },
          path: {
            routing: { kind: 'orthogonal', via: '|-', labelStep: 'main' },
            label: { text: { field: 'deltaLabel' }, position: 0.5 },
          },
        },
      ]),
      {
        d: [
          { x: 0, value: 2 },
          { x: 10, value: 18 },
        ],
      },
      { width: 50, height: 200 },
    );
    const [path] = collectPaths(markLayer(root, 0));
    expect(path.children).toHaveLength(3);
    expect(path.children[1]).toMatchObject({ kind: 'line', label: { text: '+16', position: 0.5, sloped: true } });
    expect(path.children[2]).toMatchObject({ kind: 'line' });
  });

  it('rejects route and routing conflicts plus malformed orthogonal routing', () => {
    expect(() =>
      baseSpec([
        {
          type: 'relation',
          source: { id: 'A' },
          target: { id: 'B' },
          path: {
            route: [{ kind: 'line' }],
            routing: { kind: 'line' },
          },
        },
      ]),
    ).toThrow(/route and routing/);

    expect(() =>
      baseSpec([
        {
          type: 'relation',
          source: { id: 'A' },
          target: { id: 'B' },
          path: { routing: { kind: 'orthogonal' } },
        },
      ]),
    ).toThrow(/via/);
  });

  it('lowers ribbon relation kind to core ribbon path with shared style and field-bound width', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'relation',
          kind: 'ribbon',
          source: { project: { x: 'sourceX', y: 'sourceY' } },
          target: { project: { x: 'targetX', y: 'targetY' } },
          style: {
            fill: { kind: 'field', value: 'fill' },
            fillOpacity: { kind: 'constant', value: 0.55 },
            stroke: { kind: 'constant', value: 'none' },
          },
          ribbon: {
            width: { kind: 'field', value: 'width' },
            endWidth: { kind: 'constant', value: 8 },
            options: { interpolation: 'smooth', align: 'center' },
          },
        },
      ]),
      {
        d: [{ sourceX: 0, sourceY: 0, targetX: 1, targetY: 1, fill: '#38bdf8', width: 12 }],
      },
    );
    const [ribbon] = collectRibbons(markLayer(root, 0));
    expect(ribbon).toMatchObject({
      type: 'path',
      kind: 'ribbon',
      children: [
        { kind: 'move', to: [0, 100] },
        { kind: 'cubic', control1: [100, 100], control2: [100, 0], to: [200, 0] },
      ],
      kindOptions: {
        start: { width: 12, direction: 0 },
        end: { width: 8, direction: 0 },
        interpolation: 'smooth',
        align: 'center',
      },
      fill: '#38bdf8',
      fillOpacity: 0.55,
      stroke: 'none',
    });
  });

  it('delivers custom path channels to ribbon relation paths', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'relation',
          kind: 'ribbon',
          source: { project: { x: 'sourceX', y: 'sourceY' } },
          target: { project: { x: 'targetX', y: 'targetY' } },
          ribbon: {
            width: { kind: 'field', value: 'width' },
          },
          encoding: {
            channels: {
              lineWeight: { field: 'lineWeight' },
            },
          },
        },
      ]),
      {
        d: [{ sourceX: 0, sourceY: 0, targetX: 1, targetY: 1, width: 12, lineWeight: 5 }],
      },
      {
        ...opts,
        channelDefinitions: [lineWeightChannel],
      },
    );
    const [ribbon] = collectRibbons(markLayer(root, 0));
    expect(ribbon.strokeWidth).toBe(5);
  });
});
