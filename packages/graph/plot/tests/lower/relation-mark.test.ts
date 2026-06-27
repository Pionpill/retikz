import type { IRCoordinate, IRNode, IRPath, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type LowerPlotsOptions, lowerPlots } from '../../src/pipeline/expand';
import { type PlotSpec, PlotSpecSchema } from '../../src/schemas';

const opts: LowerPlotsOptions = { width: 200, height: 100 };

const expandOf = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, options: LowerPlotsOptions = opts): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
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

const baseSpec = (marks: PlotSpec['marks']): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
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
    expect(() => baseSpec([
      {
        type: 'relation',
        source: { id: 'A' },
        target: { id: 'B' },
        path: { arrow: '->', arrowDetail: { end: { length: 8 } } },
      },
    ])).not.toThrow();

    expect(() => baseSpec([
      { type: 'point', anchorId: { prefix: 'pt' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
    ])).toThrow(/exactly one of field, template, or generator/);

    expect(() => baseSpec([
      {
        type: 'relation',
        source: { id: 'A' },
        target: { id: 'B' },
        via: [{ id: 'C' }],
        route: [{ kind: 'line' }],
      },
    ])).toThrow(/cannot use via and route together/);
  });

  it('writes point anchorId to generated core Node ids', () => {
    const root = expandOf(baseSpec([
      { type: 'point', anchorId: { prefix: 'pt', field: 'id' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
    ]), { d: rows });
    const layer = markLayer(root, 0);
    const ids = (layer.children as Array<{ id?: string }>).map(child => child.id);
    expect(ids).toEqual(['pt.A', 'pt.B']);
  });

  it('writes interval anchorId to generated core Node ids', () => {
    const root = expandOf(baseSpec([
      { type: 'interval', anchorId: { prefix: 'bar', field: 'id' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
    ]), { d: rows });
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
    const root = expandOf(baseSpec([
      { type: 'point', anchorId: { template: 'pt.{field:id}' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
      {
        type: 'relation',
        source: { anchorId: { template: 'pt.{field:source}' } },
        target: { anchorId: { template: 'pt.{field:target}' } },
      },
    ]), { d: rows });
    const [path] = collectPaths(markLayer(root, 1));
    expect(path.children[0]).toMatchObject({ kind: 'move', to: { id: 'pt.A' } });
    expect(path.children[1]).toMatchObject({ kind: 'line', to: { id: 'pt.B' } });
  });

  it('writes path anchorId as per-datum coordinates', () => {
    const root = expandOf(baseSpec([
      { type: 'path', anchorId: { prefix: 'way', field: 'id' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
    ]), { d: rows });
    const coordinates = collectCoordinates(markLayer(root, 0));
    expect(coordinates.map(coordinate => coordinate.id)).toEqual(['way.A', 'way.B']);
  });

  it('lowers direct id source-target refs to core Path node targets', () => {
    const root = expandOf(baseSpec([
      {
        type: 'relation',
        source: { id: 'A', anchor: 'east' },
        target: { id: 'B', anchor: 'west' },
        path: { arrow: '->', arrowDetail: { end: { length: 10, width: 7 } } },
      },
    ]), { d: [rows[0]] });
    const [path] = collectPaths(markLayer(root, 0));
    expect(path.arrow).toBe('->');
    expect(path.arrowDetail).toMatchObject({ end: { length: 10, width: 7 } });
    expect(path.children[0]).toMatchObject({ kind: 'move', to: { id: 'A', anchor: 'east' } });
    expect(path.children[1]).toMatchObject({ kind: 'line', to: { id: 'B', anchor: 'west' } });
  });

  it('lowers generated source-target anchors to a core Path with labels and arrow passthrough', () => {
    const root = expandOf(baseSpec([
      { type: 'point', anchorId: { prefix: 'pt', field: 'id' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
      {
        type: 'relation',
        source: { anchorId: { prefix: 'pt', field: 'source' } },
        target: { anchorId: { prefix: 'pt', field: 'target' } },
        label: { text: { field: 'label' }, position: 'midway' },
        path: { arrow: '->', color: '#2563eb', marks: [{ pos: 0.5, mark: { kind: 'arrow' } }] },
      },
    ]), { d: rows });
    const [path] = collectPaths(markLayer(root, 1));
    expect(path.arrow).toBe('->');
    expect(path.color).toBe('#2563eb');
    expect(path.marks).toHaveLength(1);
    expect(path.children[0]).toMatchObject({ kind: 'move', to: { id: 'pt.A' } });
    expect(path.children[1]).toMatchObject({ kind: 'line', to: { id: 'pt.B' }, label: { text: 'A to B', side: 'sloped' } });
  });

  it('defaults relation route labels to sloped and keeps explicit route step label before shorthand label', () => {
    const root = expandOf(baseSpec([
      { type: 'point', anchorId: { prefix: 'pt', field: 'id' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
      {
        type: 'relation',
        source: { anchorId: { prefix: 'pt', field: 'source' } },
        target: { anchorId: { prefix: 'pt', field: 'target' } },
        route: [
          { kind: 'fold', via: '-|', to: { project: { x: 'x', y: 'y' } }, label: { text: { field: 'label' }, position: 0.25 } },
          { kind: 'bend', bendDirection: 'left', bendAngle: 25 },
        ],
        label: { text: 'fallback' },
        path: { roundedCorners: 6 },
      },
    ]), { d: rows });
    const [path] = collectPaths(markLayer(root, 1));
    expect(path.roundedCorners).toBe(6);
    expect(path.children[1]).toMatchObject({ kind: 'fold', label: { text: 'A to B', position: 0.25, side: 'sloped' } });
    expect(path.children[2]).toMatchObject({ kind: 'bend', bendDirection: 'left', bendAngle: 25 });
    expect('label' in path.children[2] ? path.children[2].label : undefined).toBeUndefined();
  });

  it('preserves an explicit non-sloped relation label side', () => {
    const root = expandOf(baseSpec([
      { type: 'point', anchorId: { prefix: 'pt', field: 'id' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
      {
        type: 'relation',
        source: { anchorId: { prefix: 'pt', field: 'source' } },
        target: { anchorId: { prefix: 'pt', field: 'target' } },
        label: { text: { field: 'label' }, side: 'above' },
      },
    ]), { d: rows });
    const [path] = collectPaths(markLayer(root, 1));
    expect(path.children[1]).toMatchObject({ kind: 'line', label: { text: 'A to B', side: 'above' } });
  });

  it('skips rows whose generated relation anchor fields are missing', () => {
    const root = expandOf(baseSpec([
      { type: 'point', anchorId: { prefix: 'pt', field: 'id' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
      {
        type: 'relation',
        source: { anchorId: { prefix: 'pt', field: 'source' }, boundary: true },
        target: { anchorId: { prefix: 'pt', field: 'target' }, boundary: true },
        label: { text: { field: 'label' } },
      },
    ]), {
      d: [
        { id: 'A', x: 0, y: 0 },
        { id: 'B', x: 1, y: 1 },
        { source: 'A', target: 'B', label: 'A to B' },
      ],
    });
    const [path] = collectPaths(markLayer(root, 1));
    expect(collectPaths(markLayer(root, 1))).toHaveLength(1);
    expect(path.children[0]).toMatchObject({ kind: 'move', to: { id: 'pt.A', boundary: 'shape' } });
    expect(path.children[1]).toMatchObject({ kind: 'line', to: { id: 'pt.B', boundary: 'shape' }, label: { text: 'A to B' } });
  });

  it('generates coordinates for relation projected via waypoints', () => {
    const root = expandOf(baseSpec([
      { type: 'point', anchorId: { prefix: 'pt', field: 'id' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
      {
        type: 'relation',
        id: 'rel',
        source: { anchorId: { prefix: 'pt', field: 'source' } },
        target: { anchorId: { prefix: 'pt', field: 'target' } },
        via: [{ project: { x: 'x', y: 'y' } }],
      },
    ]), { d: rows });
    const relationLayer = markLayer(root, 1);
    expect(collectCoordinates(relationLayer).map(coordinate => coordinate.id)).toEqual(['rel.0.via.0', 'rel.1.via.0']);
    expect(collectPaths(relationLayer)[0].children[1]).toMatchObject({ kind: 'line', to: { id: 'rel.0.via.0' } });
  });

  it('fails loud on duplicate anchor ids', () => {
    const spec = baseSpec([
      { type: 'point', anchorId: { prefix: 'pt', field: 'source' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
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
    const root = expandOf(baseSpec([
      { type: 'path', anchorId: { prefix: 'trend', field: 'id' }, encoding: { x: { field: 'x' }, y: { field: 'value' } } },
      {
        type: 'relation',
        transform: [
          {
            kind: 'relate',
            source: { selector: { op: 'min', by: 'value' }, fields: { id: 'id' } },
            target: { selector: { op: 'max', by: 'value' }, fields: { id: 'id' } },
            measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' }],
          },
        ],
        source: { anchorId: { prefix: 'trend', field: 'sourceId' } },
        target: { anchorId: { prefix: 'trend', field: 'targetId' } },
        routing: { kind: 'bend', bendDirection: 'left', bendAngle: 20 },
        label: { text: { field: 'deltaLabel' }, position: 0.5 },
        path: { arrow: '->' },
      },
    ]), {
      d: [
        { id: 'a', x: 0, value: 14 },
        { id: 'b', x: 1, value: 5 },
        { id: 'c', x: 2, value: 29 },
      ],
    });
    const [path] = collectPaths(markLayer(root, 1));
    expect(collectPaths(markLayer(root, 1))).toHaveLength(1);
    expect(path.arrow).toBe('->');
    expect(path.children[0]).toMatchObject({ kind: 'move', to: { id: 'trend.b' } });
    expect(path.children[1]).toMatchObject({ kind: 'bend', to: { id: 'trend.c' }, bendDirection: 'left', bendAngle: 20, label: { text: '+24', position: 0.5, side: 'sloped' } });
  });

  it('uses relation-local projected fields for scale domain and lowering', () => {
    const root = expandOf(baseSpec([
      {
        type: 'relation',
        transform: [
          {
            kind: 'relate',
            source: { selector: { op: 'first' }, fields: { x: 'x', y: 'value' } },
            target: { selector: { op: 'last' }, fields: { x: 'x', y: 'value' } },
          },
        ],
        source: { project: { x: 'sourceX', y: 'sourceY' } },
        target: { project: { x: 'targetX', y: 'targetY' } },
        routing: { kind: 'line' },
      },
    ]), {
      d: [
        { id: 'a', x: 10, value: 3 },
        { id: 'b', x: 30, value: 9 },
      ],
    });
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
              source: { selector: { op: 'first' }, fields: { x: 'x', y: 'value' } },
              target: { selector: { op: 'last' }, fields: { x: 'x', y: 'value' } },
              measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' }],
            },
          ],
          source: { project: { x: 'sourceX', y: 'sourceY' } },
          target: { project: { x: 'targetX', y: 'targetY' } },
          routing: { kind: 'orthogonal', via: '|-', labelStep: 'main' },
          label: { text: { field: 'deltaLabel' }, position: 0.5 },
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
    expect(path.children[1]).toMatchObject({ kind: 'line', label: { text: '+16', position: 0.5, side: 'sloped' } });
    expect(path.children[2]).toMatchObject({ kind: 'line' });
  });

  it('rejects route and routing conflicts plus malformed orthogonal routing', () => {
    expect(() => baseSpec([
      {
        type: 'relation',
        source: { id: 'A' },
        target: { id: 'B' },
        route: [{ kind: 'line' }],
        routing: { kind: 'line' },
      },
    ])).toThrow(/route and routing/);

    expect(() => baseSpec([
      {
        type: 'relation',
        source: { id: 'A' },
        target: { id: 'B' },
        routing: { kind: 'orthogonal' },
      },
    ])).toThrow(/via/);
  });
});
