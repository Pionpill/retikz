import type { IRCoordinate, IRNode, IRPath, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { markChannelEncoding, channelField } from '../../../src/contract';
import type { PositionScale } from '../../../src/contract';
import { definePathChannel } from '../../../src/contract';
import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import { lowerPlot } from '../../../src/pipeline/expand/lower';
import { createPolarCoordinate, lowerMark as lowerMarkDefinition, MARK_REGISTRY } from '../../../src/providers';
import { resolveMarkOperation } from '../../../src/resolve/mark';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema, PolarInterpolation } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

const opts: LowerPlotsOptions = { layout: { width: 200, height: 100 } };

const markRegistry = MARK_REGISTRY;

const linearScale = (domain: [number, number], range: [number, number]): PositionScale => ({
  coordinate: value => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return Number.NaN;
    return range[0] + ((value - domain[0]) / (domain[1] - domain[0])) * (range[1] - range[0]);
  },
  domain: () => domain,
  bandwidth: 0,
  step: 0,
  ticks: () => ({ values: domain, labels: domain.map(String) }),
  range: () => range,
  setRange: () => undefined,
});

const lineWeightChannel = definePathChannel<number>({
  channel: 'lineWeight',
  output: { outputKind: 'number', range: [1, 6] },
  resolve: (_ctx, mark) => {
    const binding = markChannelEncoding(mark, 'lineWeight');
    if (binding === undefined) return undefined;

    const field = channelField(binding);

    return {
      resolver: row => {
        const value = Number(row[field]);
        return Number.isFinite(value) ? value : undefined;
      },
    };
  },
  deliver: (path, value) => {
    path.style = { ...path.style, strokeWidth: value };
  },
});

const expandOf = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: LowerPlotsOptions = opts,
): IRScope => {
  return lowerPlot(spec, datasets, { ...options, textMeasurer: measureLabel }) as IRScope;
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

const baseSpec = (marks: unknown): IRPlot =>
  PlotSchema.parse({
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

const polarSpec = (marks: unknown, interpolation: 'polar' | 'chord' = 'polar'): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x', domainPadding: 0 },
      { type: 'linear', name: 'y', domainPadding: 0 },
    ],
    coordinate: { type: 'polar2D', angle: 'x', radius: 'y', interpolation },
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
          properties: {
            source: { anchorId: { template: 'A' } },
            target: { anchorId: { template: 'B' } },
            geometry: { kind: 'path', options: { marks: [{ pos: 1, mark: { kind: 'arrow', length: 8 } }] } },
          },
        },
      ]),
    ).not.toThrow();

    expect(() =>
      baseSpec([
        {
          type: 'relation',
          properties: {
            source: { anchorId: { template: 'A' } },
            target: { anchorId: { template: 'B' } },
            geometry: { kind: 'path', options: { arrow: '->', arrowDetail: { end: { length: 8 } } } },
          },
        },
      ]),
    ).toThrow();

    expect(() =>
      baseSpec([
        {
          type: 'point',
          encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: { anchorId: { prefix: 'pt' } },
        },
      ]),
    ).toThrow(/exactly one of field, template, or generator/);

    expect(() =>
      baseSpec([
        {
          type: 'relation',
          properties: {
            source: { anchorId: { template: 'A' } },
            target: { anchorId: { template: 'B' } },
            geometry: { kind: 'path', via: [{ anchorId: { template: 'C' } }], route: [{ kind: 'line' }] },
          },
        },
      ]),
    ).toThrow(/cannot use via and route together/);
  });

  it('writes point anchorId to generated core Node ids', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'point',
          encodings: { anchorId: 'id', position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: { anchorId: { prefix: 'pt' } },
        },
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
          encodings: { anchorId: 'id', position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: { anchorId: { prefix: 'bar' } },
        },
      ]),
      { d: rows },
    );

    expect(collectNodes(markLayer(root, 0)).map(node => node.id)).toEqual(['bar.A', 'bar.B']);
  });

  it('supports runtime anchorId generator keys without storing functions in the spec', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'point',
          encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: { anchorId: { generator: 'city' } },
        },
      ]),
      { d: rows },
      {
        ...opts,
        anchorIdGenerators: {
          city: instance =>
            instance.kind === 'row' ? `generated.${String(instance.row.id).toLowerCase()}` : 'generated.single',
        },
      },
    );
    const ids = (markLayer(root, 0).children as Array<{ id?: string }>).map(child => child.id);

    expect(ids).toEqual(['generated.a', 'generated.b']);
  });

  it('collects and resolves anchorId template field placeholders', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'point',
          encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: { anchorId: { template: 'pt.{field:id}' } },
        },
        {
          type: 'relation',
          properties: {
            source: { anchorId: { template: 'pt.{field:source}' } },
            target: { anchorId: { template: 'pt.{field:target}' } },
            geometry: { kind: 'path' },
          },
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
        {
          type: 'path',
          encodings: { anchorId: 'id', position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: { anchorId: { prefix: 'way' } },
        },
      ]),
      { d: rows },
    );
    const coordinates = collectCoordinates(markLayer(root, 0));

    expect(coordinates.map(coordinate => coordinate.id)).toEqual(['way.A', 'way.B']);
  });

  it('lowers fixed generated anchor source-target refs to core Path node targets', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'point',
          encodings: { anchorId: 'id', position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: { anchorId: { prefix: 'pt' } },
        },
        {
          type: 'relation',
          properties: {
            source: { anchorId: { template: 'pt.A' }, anchor: 'right' },
            target: { anchorId: { template: 'pt.B' }, anchor: 'left' },
            geometry: { kind: 'path', options: { marks: [{ pos: 1, mark: { kind: 'arrow', length: 10, width: 7 } }] } },
          },
        },
      ]),
      { d: rows },
    );
    const [path] = collectPaths(markLayer(root, 1));

    expect(path.marks).toEqual([{ pos: 1, mark: { kind: 'arrow', length: 10, width: 7 } }]);
    expect(path.children[0]).toMatchObject({ kind: 'move', to: { id: 'pt.A', anchor: 'right' } });
    expect(path.children[1]).toMatchObject({ kind: 'line', to: { id: 'pt.B', anchor: 'left' } });
  });

  it('lowers generated source-target anchors to a core Path with labels and path mark config', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'point',
          encodings: { anchorId: 'id', position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: { anchorId: { prefix: 'pt' } },
        },
        {
          type: 'relation',
          encodings: {
            source: { anchorId: 'source' },
            target: { anchorId: 'target' },
            geometry: { label: { text: 'label' } },
          },
          properties: {
            color: '#2563eb',
            source: { anchorId: { prefix: 'pt' } },
            target: { anchorId: { prefix: 'pt' } },
            geometry: {
              kind: 'path',
              label: { position: 'midway' },
              options: {
                marks: [
                  { pos: 0.5, mark: { kind: 'arrow' } },
                  { pos: 1, mark: { kind: 'arrow' } },
                ],
              },
            },
          },
        },
      ]),
      { d: rows },
    );
    const [path] = collectPaths(markLayer(root, 1));

    expect(path.style?.color).toBe('#2563eb');
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
        {
          type: 'point',
          encodings: { anchorId: 'id', position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: { anchorId: { prefix: 'pt' } },
        },
        {
          type: 'relation',
          encodings: {
            source: { anchorId: 'source' },
            target: { anchorId: 'target' },
            geometry: {
              route: [{ label: { text: 'label' }, to: { position: { x: { field: 'x' }, y: { field: 'y' } } } }, {}],
            },
          },
          properties: {
            source: { anchorId: { prefix: 'pt' } },
            target: { anchorId: { prefix: 'pt' } },
            geometry: {
              kind: 'path',
              label: { text: 'fallback' },
              options: { cornerRadius: 6 },
              route: [
                { kind: 'fold', via: '-|', label: { position: 0.25 }, to: {} },
                { kind: 'bend', bendDirection: 'left', bendAngle: 25 },
              ],
            },
          },
        },
      ]),
      { d: rows },
    );
    const [path] = collectPaths(markLayer(root, 1));

    expect(path.cornerRadius).toBe(6);
    expect(path.children[1]).toMatchObject({ kind: 'fold', label: { text: 'A to B', position: 0.25, sloped: true } });
    expect(path.children[2]).toMatchObject({ kind: 'bend', bendDirection: 'left', bendAngle: 25 });
    expect('label' in path.children[2] ? path.children[2].label : undefined).toBeUndefined();
  });

  it('passes explicit relation label canonical side names', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'point',
          encodings: { anchorId: 'id', position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: { anchorId: { prefix: 'pt' } },
        },
        {
          type: 'relation',
          encodings: {
            source: { anchorId: 'source' },
            target: { anchorId: 'target' },
            geometry: { label: { text: 'label' } },
          },
          properties: {
            source: { anchorId: { prefix: 'pt' } },
            target: { anchorId: { prefix: 'pt' } },
            geometry: { kind: 'path', label: { side: 'top' } },
          },
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
        {
          type: 'point',
          encodings: { anchorId: 'id', position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: { anchorId: { prefix: 'pt' } },
        },
        {
          type: 'relation',
          encodings: {
            source: { anchorId: 'source' },
            target: { anchorId: 'target' },
            geometry: { label: { text: 'label' } },
          },
          properties: {
            source: { anchorId: { prefix: 'pt' }, boundary: true },
            target: { anchorId: { prefix: 'pt' }, boundary: true },
            geometry: { kind: 'path', label: {} },
          },
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
        {
          type: 'point',
          encodings: { anchorId: 'id', position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: { anchorId: { prefix: 'pt' } },
        },
        {
          type: 'relation',
          id: 'rel',
          encodings: {
            source: { anchorId: 'source' },
            target: { anchorId: 'target' },
            geometry: { via: [{ position: { x: { field: 'x' }, y: { field: 'y' } } }] },
          },
          properties: {
            source: { anchorId: { prefix: 'pt' } },
            target: { anchorId: { prefix: 'pt' } },
            geometry: { kind: 'path', via: [{}] },
          },
        },
      ]),
      { d: rows },
    );
    const relationLayer = markLayer(root, 1);

    expect(collectCoordinates(relationLayer).map(coordinate => coordinate.id)).toEqual(['rel.0.via.0', 'rel.1.via.0']);
    expect(collectPaths(relationLayer)[0].children[1]).toMatchObject({ kind: 'line', to: { id: 'rel.0.via.0' } });
  });

  it('inherits polar interpolation for a default all-projected relation path', () => {
    const root = expandOf(
      polarSpec([
        {
          type: 'relation',
          encodings: {
            source: { position: { x: { field: 'sourceAngle' }, y: { field: 'sourceRadius' } } },
            target: { position: { x: { field: 'targetAngle' }, y: { field: 'targetRadius' } } },
          },
          properties: { geometry: { kind: 'path' } },
        },
      ]),
      { d: [{ sourceAngle: 0, sourceRadius: 4, targetAngle: 10, targetRadius: 8 }] },
    );
    const [path] = collectPaths(markLayer(root, 0));

    expect(path.children[0]).toMatchObject({ kind: 'move' });
    expect(path.children[1]).toMatchObject({ kind: 'smooth' });
    expect(path.children[1].kind === 'smooth' && path.children[1].points.length).toBeGreaterThan(2);
  });

  it('lets a relation polar override take precedence over a chord coordinate', () => {
    const root = expandOf(
      polarSpec(
        [
          {
            type: 'relation',
            encodings: {
              source: { position: { x: { field: 'sourceAngle' }, y: { field: 'sourceRadius' } } },
              target: { position: { x: { field: 'targetAngle' }, y: { field: 'targetRadius' } } },
            },
            properties: { geometry: { kind: 'path', interpolation: 'polar' } },
          },
        ],
        'chord',
      ),
      { d: [{ sourceAngle: 0, sourceRadius: 4, targetAngle: 10, targetRadius: 8 }] },
    );
    const [path] = collectPaths(markLayer(root, 0));

    expect(path.children[1]).toMatchObject({ kind: 'smooth' });
  });

  it('samples projected via segments while preserving every authored target identity', () => {
    const root = expandOf(
      polarSpec([
        {
          type: 'relation',
          encodings: {
            source: { position: { x: { field: 'sourceAngle' }, y: { field: 'sourceRadius' } }, anchorId: 'edgeId' },
            target: { position: { x: { field: 'targetAngle' }, y: { field: 'targetRadius' } }, anchorId: 'edgeId' },
            geometry: {
              via: [{ anchorId: 'edgeId', position: { x: { field: 'viaAngle' }, y: { field: 'viaRadius' } } }],
            },
          },
          properties: {
            source: { anchorId: { prefix: 'source' } },
            target: { anchorId: { prefix: 'target' } },
            geometry: {
              kind: 'path',
              interpolation: 'polar',
              label: { text: 'route' },
              via: [{ anchorId: { prefix: 'via' } }],
            },
          },
        },
      ]),
      {
        d: [
          {
            edgeId: 'A',
            sourceAngle: 0,
            sourceRadius: 4,
            viaAngle: 5,
            viaRadius: 8,
            targetAngle: 10,
            targetRadius: 6,
          },
        ],
      },
    );
    const [path] = collectPaths(markLayer(root, 0));

    expect(path.children[0]).toMatchObject({ kind: 'move', to: { id: 'source.A' } });
    expect(path.children.filter(step => step.kind === 'smooth')).toHaveLength(2);
    expect(path.children.some(step => step.kind === 'smooth' && step.points.some(Array.isArray))).toBe(true);
    expect(path.children[1]).toMatchObject({ kind: 'smooth', points: expect.arrayContaining([{ id: 'via.A' }]) });
    expect(path.children[path.children.length - 1]).toMatchObject({
      kind: 'smooth',
      points: expect.arrayContaining([{ id: 'target.A' }]),
      label: { text: 'route' },
    });
  });

  it('keeps projected polar vertices when anchor context is absent', () => {
    const spec = polarSpec([
      {
        type: 'relation',
        encodings: {
          source: { position: { x: { field: 'sourceAngle' }, y: { field: 'sourceRadius' } }, anchorId: 'edgeId' },
          target: { position: { x: { field: 'targetAngle' }, y: { field: 'targetRadius' } }, anchorId: 'edgeId' },
        },
        properties: {
          source: { anchorId: { prefix: 'source' } },
          target: { anchorId: { prefix: 'target' } },
          geometry: { kind: 'path' },
        },
      },
    ]);
    const frame = createPolarCoordinate({
      center: [0, 0],
      innerRadius: 0,
      outerRadius: 100,
      startAngle: 0,
      endAngle: 360,
      interpolation: PolarInterpolation.Polar,
      angularSkeleton: [0, 90, 180, 270],
      primary: linearScale([0, 10], [0, 360]),
      secondary: linearScale([0, 10], [0, 100]),
    });
    const layer = lowerMarkDefinition(
      resolveMarkOperation(spec.marks[0], { registry: markRegistry }),
      { kind: 'rows', rows: [{ edgeId: 'A', sourceAngle: 0, sourceRadius: 4, targetAngle: 10, targetRadius: 8 }] },
      frame,
    ) as IRScope;
    const [path] = collectPaths(layer);

    expect(path.children[1]).toMatchObject({ kind: 'smooth' });
  });

  it('rejects explicit relation interpolation on unsupported coordinate and target forms', () => {
    const cartesian = baseSpec([
      {
        type: 'relation',
        encodings: {
          source: { position: { x: { field: 'sourceAngle' }, y: { field: 'sourceRadius' } } },
          target: { position: { x: { field: 'targetAngle' }, y: { field: 'targetRadius' } } },
        },
        properties: { geometry: { kind: 'path', interpolation: 'polar' } },
      },
    ]);

    expect(() =>
      expandOf(cartesian, { d: [{ sourceAngle: 0, sourceRadius: 4, targetAngle: 10, targetRadius: 8 }] }),
    ).toThrow(/relation.*interpolation.*polar2D/i);

    const unresolvedTarget = polarSpec([
      {
        type: 'relation',
        encodings: { target: { position: { x: { field: 'targetAngle' }, y: { field: 'targetRadius' } } } },
        properties: { source: { anchorId: { template: 'A' } }, geometry: { kind: 'path', interpolation: 'polar' } },
      },
    ]);

    expect(() => expandOf(unresolvedTarget, { d: [{ targetAngle: 10, targetRadius: 8 }] })).toThrow(
      /relation.*interpolation.*projected/i,
    );
  });

  it('rejects explicit relation interpolation with route, routing, or ribbon geometry', () => {
    const row = { sourceAngle: 0, sourceRadius: 4, targetAngle: 10, targetRadius: 8 };
    const projectedTargets = {
      source: { position: { x: { value: 'sourceAngle' }, y: { value: 'sourceRadius' } } },
      target: { position: { x: { value: 'targetAngle' }, y: { value: 'targetRadius' } } },
    };

    expect(() =>
      expandOf(
        polarSpec([
          {
            type: 'relation',
            encodings: projectedTargets,
            properties: { geometry: { kind: 'path', interpolation: 'polar', route: [{ kind: 'line' }] } },
          },
        ]),
        { d: [row] },
      ),
    ).toThrow(/relation.*interpolation.*route/i);
    expect(() =>
      expandOf(
        polarSpec([
          {
            type: 'relation',
            encodings: projectedTargets,
            properties: { geometry: { kind: 'path', interpolation: 'polar', routing: { kind: 'line' } } },
          },
        ]),
        { d: [row] },
      ),
    ).toThrow(/relation.*interpolation.*routing/i);
    expect(() =>
      polarSpec([
        {
          type: 'relation',
          encodings: projectedTargets,
          properties: { geometry: { kind: 'ribbon', interpolation: 'polar', width: 8 } },
        },
      ]),
    ).toThrow();
  });

  it('preserves unsupported relation-owned routing when interpolation is omitted', () => {
    const root = expandOf(
      polarSpec([
        {
          type: 'relation',
          encodings: {
            source: { position: { x: { field: 'sourceAngle' }, y: { field: 'sourceRadius' } } },
            target: { position: { x: { field: 'targetAngle' }, y: { field: 'targetRadius' } } },
          },
          properties: { geometry: { kind: 'path', routing: { kind: 'line' } } },
        },
      ]),
      { d: [{ sourceAngle: 0, sourceRadius: 4, targetAngle: 10, targetRadius: 8 }] },
    );
    const [path] = collectPaths(markLayer(root, 0));

    expect(path.children).toHaveLength(2);
    expect(path.children.map(step => step.kind)).toEqual(['move', 'line']);
  });

  it('fails loud on duplicate anchor ids', () => {
    const spec = baseSpec([
      {
        type: 'point',
        encodings: { anchorId: 'source', position: { x: { field: 'x' }, y: { field: 'y' } } },
        properties: { anchorId: { prefix: 'pt' } },
      },
    ]);

    expect(() => expandOf(spec, { d: rows })).toThrow(/duplicate anchor id "pt.A"/);
  });

  it('fails loud on missing generated relation anchors after lowering', () => {
    const spec = baseSpec([
      {
        type: 'point',
        encodings: { anchorId: 'id', position: { x: { field: 'x' }, y: { field: 'y' } } },
        properties: { anchorId: { prefix: 'pt' } },
      },
      {
        type: 'relation',
        encodings: { source: { anchorId: 'source' }, target: { anchorId: 'missing' } },
        properties: {
          source: { anchorId: { prefix: 'pt' } },
          target: { anchorId: { prefix: 'pt' } },
          geometry: { kind: 'path' },
        },
      },
    ]);

    expect(() => expandOf(spec, { d: [{ id: 'A', x: 0, y: 0, source: 'A', missing: 'Z' }] })).toThrow(/pt.Z/);
  });

  it('derives relation rows locally and connects generated anchor targets', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'path',
          encodings: { anchorId: 'id', position: { x: { field: 'x' }, y: { field: 'value' } } },
          properties: { anchorId: { prefix: 'trend' } },
        },
        {
          type: 'relation',
          transforms: [
            {
              operation: {
                kind: 'relate',
                params: {
                  source: { selector: { kind: 'min', by: 'value' }, fields: { id: 'id' } },
                  target: { selector: { kind: 'max', by: 'value' }, fields: { id: 'id' } },
                  measures: [
                    { op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' },
                  ],
                },
              },
            },
          ],
          encodings: {
            source: { anchorId: 'sourceId' },
            target: { anchorId: 'targetId' },
            geometry: { label: { text: 'deltaLabel' } },
          },
          properties: {
            source: { anchorId: { prefix: 'trend' } },
            target: { anchorId: { prefix: 'trend' } },
            geometry: {
              kind: 'path',
              routing: { kind: 'bend', bendDirection: 'left', bendAngle: 20 },
              label: { position: 0.5 },
              options: { marks: [{ pos: 1, mark: { kind: 'arrow' } }] },
            },
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
          transforms: [
            {
              operation: {
                kind: 'relate',
                params: {
                  source: { selector: { kind: 'first' }, fields: { x: 'x', y: 'value' } },
                  target: { selector: { kind: 'last' }, fields: { x: 'x', y: 'value' } },
                },
              },
            },
          ],
          encodings: {
            source: { position: { x: { field: 'sourceX' }, y: { field: 'sourceY' } } },
            target: { position: { x: { field: 'targetX' }, y: { field: 'targetY' } } },
          },
          properties: { geometry: { kind: 'path', routing: { kind: 'line' } } },
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

  it('atomically lowers projected relation endpoint glyphs after connectors', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'relation',
          encodings: {
            source: { position: { x: { field: 'start' }, y: { field: 'category' } } },
            target: { position: { x: { field: 'end' }, y: { field: 'category' } } },
          },
          properties: {
            stroke: '#64748b',
            endpoints: {
              source: { color: '#2563eb', size: 5 },
              target: { color: '#dc2626', shape: 'diamond', size: 6 },
            },
            geometry: { kind: 'path' },
          },
        },
      ]),
      {
        d: [
          { category: 0, start: 0, end: 1 },
          { category: 0.5, start: null, end: 0.75 },
        ],
      },
    );
    const layer = markLayer(root, 0);
    const paths = collectPaths(layer);
    const nodes = collectNodes(layer);

    expect(paths).toHaveLength(1);
    expect(nodes).toHaveLength(2);
    expect(layer.children.map(child => child.type)).toEqual(['path', 'node', 'node']);
    expect(nodes.map(node => node.position)).toEqual([
      [0, 100],
      [200, 100],
    ]);
    expect(nodes[0]).toMatchObject({
      style: { fill: '#2563eb' },
      layout: { minimumSize: 5 * Math.SQRT2 },
    });
    expect(nodes[1]).toMatchObject({
      shape: 'diamond',
      style: { fill: '#dc2626' },
      layout: { minimumSize: 6 * Math.SQRT2 },
    });
  });

  it('uses the same final-radius geometry for Point and Relation endpoint glyphs', () => {
    const root = expandOf(
      baseSpec([
        { type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } }, properties: { size: 5 } },
        {
          type: 'relation',
          encodings: {
            source: { position: { x: { field: 'start' }, y: { field: 'category' } } },
            target: { position: { x: { field: 'end' }, y: { field: 'category' } } },
          },
          properties: { endpoints: { source: { size: 5 }, target: { size: 5 } }, geometry: { kind: 'path' } },
        },
      ]),
      { d: [{ x: 0.5, y: 0.5, category: 0.5, start: 0.25, end: 0.75 }] },
    );
    const [point] = collectNodes(markLayer(root, 0));
    const endpoints = collectNodes(markLayer(root, 1));

    expect(endpoints.map(endpoint => endpoint.layout?.minimumSize)).toEqual([
      point.layout?.minimumSize,
      point.layout?.minimumSize,
    ]);
  });

  it('keeps zero-length projected relations and overlapping endpoint glyphs', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'relation',
          encodings: {
            source: { position: { x: { field: 'start' }, y: { field: 'category' } } },
            target: { position: { x: { field: 'end' }, y: { field: 'category' } } },
          },
          properties: { endpoints: { source: {}, target: {} }, geometry: { kind: 'path' } },
        },
      ]),
      { d: [{ category: 0, start: 0.5, end: 0.5 }] },
    );
    const layer = markLayer(root, 0);
    const [path] = collectPaths(layer);
    const nodes = collectNodes(layer);

    expect(path.children).toEqual([
      { type: 'step', kind: 'move', to: [100, 50] },
      { type: 'step', kind: 'line', to: [100, 50] },
    ]);
    expect(nodes.map(node => node.position)).toEqual([
      [100, 50],
      [100, 50],
    ]);
  });

  it('keeps endpoint datum provenance without registering duplicate datum ids', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'relation',
          encodings: {
            source: { position: { x: { field: 'start' }, y: { field: 'category' } } },
            target: { position: { x: { field: 'end' }, y: { field: 'category' } } },
          },
          properties: { endpoints: { source: {}, target: {} }, geometry: { kind: 'path' } },
        },
      ]),
      { d: [{ key: 'range-a', category: 0, start: 0.25, end: 0.75 }] },
      { ...opts, provenance: true, datumProvenance: true, datumIdField: 'key' },
    );
    const nodes = collectNodes(markLayer(root, 0));

    expect(nodes).toHaveLength(2);
    expect(nodes.map(node => node.id)).toEqual([undefined, undefined]);
    expect(nodes.map(node => node.meta)).toEqual([
      expect.objectContaining({ mark: 'relation', markIndex: 0, transformedIndex: 0, sourceIndex: 0 }),
      expect.objectContaining({ mark: 'relation', markIndex: 0, transformedIndex: 0, sourceIndex: 0 }),
    ]);
  });

  it('lowers orthogonal routing to explicit line segments and attaches shorthand label to the main segment', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'relation',
          id: 'delta',
          transforms: [
            {
              operation: {
                kind: 'relate',
                params: {
                  source: { selector: { kind: 'first' }, fields: { x: 'x', y: 'value' } },
                  target: { selector: { kind: 'last' }, fields: { x: 'x', y: 'value' } },
                  measures: [
                    { op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' },
                  ],
                },
              },
            },
          ],
          encodings: {
            source: { position: { x: { field: 'sourceX' }, y: { field: 'sourceY' } } },
            target: { position: { x: { field: 'targetX' }, y: { field: 'targetY' } } },
            geometry: { label: { text: 'deltaLabel' } },
          },
          properties: {
            geometry: {
              kind: 'path',
              routing: { kind: 'orthogonal', via: '|-', labelStep: 'main' },
              label: { position: 0.5 },
            },
          },
        },
      ]),
      {
        d: [
          { x: 0, value: 2 },
          { x: 10, value: 18 },
        ],
      },
      { layout: { width: 50, height: 200 } },
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
          properties: {
            source: { anchorId: { template: 'A' } },
            target: { anchorId: { template: 'B' } },
            geometry: { kind: 'path', route: [{ kind: 'line' }], routing: { kind: 'line' } },
          },
        },
      ]),
    ).toThrow(/route and routing/);

    expect(() =>
      baseSpec([
        {
          type: 'relation',
          properties: {
            source: { anchorId: { template: 'A' } },
            target: { anchorId: { template: 'B' } },
            geometry: { kind: 'path', routing: { kind: 'orthogonal' } },
          },
        },
      ]),
    ).toThrow(/via/);
  });

  it('lowers ribbon relation kind to core ribbon path with shared style and field-bound width', () => {
    const root = expandOf(
      {
        ...baseSpec([
          {
            type: 'relation',
            encodings: {
              fill: 'fill',
              source: { position: { x: { field: 'sourceX' }, y: { field: 'sourceY' } } },
              target: { position: { x: { field: 'targetX' }, y: { field: 'targetY' } } },
              geometry: { width: 'width' },
            },
            properties: {
              stroke: 'none',
              opacity: { fill: 0.55 },
              geometry: { kind: 'ribbon', endWidth: 8, options: { interpolation: 'smooth', align: 'center' } },
            },
          },
        ]),
        defaultPlot: { palette: { categorical: ['#123456'] } },
      },
      {
        d: [{ sourceX: 0, sourceY: 0, targetX: 1, targetY: 1, fill: '#38bdf8', width: 12 }],
      },
    );
    const [ribbon] = collectRibbons(markLayer(root, 0));

    expect(ribbon.kindOptions).not.toHaveProperty('start.direction');
    expect(ribbon.kindOptions).not.toHaveProperty('end.direction');
    expect(ribbon).toMatchObject({
      type: 'path',
      kind: 'ribbon',
      children: [
        { kind: 'move', to: [0, 100] },
        { kind: 'cubic', control1: [100, 100], control2: [100, 0], to: [200, 0] },
      ],
      kindOptions: {
        width: { kind: 'taper', start: 12, end: 8, interpolation: 'smooth' },
        align: 'center',
      },
      style: { fill: '#123456', stroke: 'none', opacity: { fill: 0.55 } },
    });
  });

  it('delivers custom path channels to ribbon relation paths', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'relation',
          encodings: {
            lineWeight: 'lineWeight',
            source: { position: { x: { field: 'sourceX' }, y: { field: 'sourceY' } } },
            target: { position: { x: { field: 'targetX' }, y: { field: 'targetY' } } },
            geometry: { width: 'width' },
          },
          properties: { geometry: { kind: 'ribbon' } },
        },
      ]),
      {
        d: [{ sourceX: 0, sourceY: 0, targetX: 1, targetY: 1, width: 12, lineWeight: 5 }],
      },
      { definitions: { channels: [lineWeightChannel] }, ...opts },
    );
    const [ribbon] = collectRibbons(markLayer(root, 0));

    expect(ribbon.style?.strokeWidth).toBe(5);
  });
});
