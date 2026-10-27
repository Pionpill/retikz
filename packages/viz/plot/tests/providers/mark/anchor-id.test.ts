import type { IRCoordinate, IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import { lowerPlot } from '../../../src/pipeline/expand/lower';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

const opts: LowerPlotsOptions = { layout: { width: 200, height: 100 } };
const expandOf = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: LowerPlotsOptions = opts,
): IRScope => {
  return lowerPlot(spec, datasets, { ...options, textMeasurer: measureLabel }) as IRScope;
};

const markLayer = (root: IRScope, index: number): IRScope => root.children[index] as IRScope;

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

describe('Mark anchor identities', () => {
  const rows = [
    { id: 'A', x: 0, y: 0, source: 'A', target: 'B', label: 'A to B' },
    { id: 'B', x: 1, y: 1, source: 'A', target: 'B', label: 'A to B' },
  ];

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
});
