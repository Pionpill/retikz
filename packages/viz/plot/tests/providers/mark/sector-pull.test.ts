import type { IRNode, IRScope } from '@retikz/core';

import { arcEndPoint } from '@retikz/math';
import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import type { IRPlot } from '../../../src/schemas';

import { createPlotLocator } from '../../../src/pipeline';
import { lowerPlots } from '../../../src/pipeline/expand';
import { PlotSchema } from '../../../src/schemas';

const opts: LowerPlotsOptions = { width: 400, height: 400 };

const share = [
  { label: 'A', value: 25, offset: 0 },
  { label: 'B', value: 75, offset: 18 },
];

const expandOf = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: LowerPlotsOptions = opts,
): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec).children[0] as IRScope;
};

const firstLayer = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: LowerPlotsOptions = opts,
): IRScope => expandOf(spec, datasets, options).children[0] as IRScope;

const sectorNodes = (layer: IRScope): Array<IRNode> => {
  const out: Array<IRNode> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'node') out.push(child as IRNode);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

const sectorParams = (
  node: IRNode,
): { innerRadius: number; outerRadius: number; startAngle: number; endAngle: number } => {
  const shape = node.shape as { type?: string; params?: Record<string, number> } | undefined;
  expect(shape?.type).toBe('sector');
  return shape!.params as { innerRadius: number; outerRadius: number; startAngle: number; endAngle: number };
};

const vectorPosition = (node: IRNode): [number, number] => {
  const { position } = node;
  expect(Array.isArray(position)).toBe(true);
  if (!Array.isArray(position) || typeof position[0] !== 'number' || typeof position[1] !== 'number') {
    throw new Error('expected cartesian node position');
  }
  return [position[0], position[1]];
};

const pieSpec = (pull?: unknown, extraMark: Record<string, unknown> = {}, innerRadius = 0): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'share' },
    transform: [{ kind: 'stack', y: 'value' }],
    coordinate: { type: 'polar2D', angle: 'angle', radius: 'radius', innerRadius },
    scales: [
      { type: 'linear', name: 'angle', domainPadding: 0 },
      { type: 'linear', name: 'radius', domainPadding: 0 },
    ],
    marks: [
      {
        type: 'interval',
        bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } },
        ...(pull !== undefined ? { pull } : {}),
        ...extraMark,
        encoding: { color: { field: 'label' } },
      },
    ],
  });

describe('IntervalMark.pull sector geometry', () => {
  it('constant pull moves sector node center along the final mid angle', () => {
    const spec = pieSpec({ kind: 'constant', value: 20 });
    const nodes = sectorNodes(firstLayer(spec, { share }));
    expect(nodes).toHaveLength(2);
    const params = sectorParams(nodes[0]);
    expect(params.startAngle).toBeCloseTo(0, 6);
    expect(params.endAngle).toBeCloseTo(90, 6);
    expect(nodes[0].position).toEqual(arcEndPoint([200, 200], 20, 45));
  });

  it('field-bound pull only moves rows with a non-zero field value', () => {
    const nodes = sectorNodes(firstLayer(pieSpec({ kind: 'field', value: 'offset' }), { share }));
    expect(nodes[0].position).toEqual([200, 200]);
    expect(nodes[1].position).toEqual(arcEndPoint([200, 200], 18, 225));
  });

  it('padAngle and pull use the padded sector mid angle without rewriting radii', () => {
    const nodes = sectorNodes(firstLayer(pieSpec({ kind: 'constant', value: 12 }, { padAngle: 10 }, 0.5), { share }));
    const params = sectorParams(nodes[0]);
    expect(params.startAngle).toBeCloseTo(5, 6);
    expect(params.endAngle).toBeCloseTo(85, 6);
    expect(params.innerRadius).toBeCloseTo(100, 6);
    expect(params.outerRadius).toBeCloseTo(200, 6);
    expect(nodes[0].position).toEqual(arcEndPoint([200, 200], 12, 45));
  });

  it('pull zero matches an omitted pull', () => {
    const pulled = sectorNodes(firstLayer(pieSpec({ kind: 'constant', value: 0 }), { share }));
    const plain = sectorNodes(firstLayer(pieSpec(), { share }));
    expect(pulled.map(node => node.position)).toEqual(plain.map(node => node.position));
    expect(pulled.map(sectorParams)).toEqual(plain.map(sectorParams));
  });

  it('large finite pull keeps sector radii and angles unchanged', () => {
    const nodes = sectorNodes(firstLayer(pieSpec({ kind: 'constant', value: 260 }), { share }));
    const params = sectorParams(nodes[0]);
    expect(params.innerRadius).toBeCloseTo(0, 6);
    expect(params.outerRadius).toBeCloseTo(200, 6);
    expect(params.startAngle).toBeCloseTo(0, 6);
    expect(params.endAngle).toBeCloseTo(90, 6);
    expect(nodes[0].position).toEqual(arcEndPoint([200, 200], 260, 45));
  });

  it('cartesian interval rejects pull instead of ignoring it', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'share' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'interval',
          pull: { kind: 'constant', value: 8 },
          encoding: { x: { field: 'label' }, y: { field: 'value' } },
        },
      ],
    });
    expect(() => expandOf(spec, { share })).toThrow(/pull|sector/i);
  });

  it('invalid field-bound pull fails loud', () => {
    const spec = pieSpec({ kind: 'field', value: 'offset' });
    expect(() => expandOf(spec, { share: [{ label: 'A', value: 1, offset: -1 }] })).toThrow(/pull|non-negative/i);
    expect(() => expandOf(spec, { share: [{ label: 'A', value: 1, offset: 'far' }] })).toThrow(/pull|numeric/i);
  });

  it('locator datum anchor follows pulled sector geometry', () => {
    const spec = pieSpec({ kind: 'constant', value: 20 });
    const locator = createPlotLocator(spec, { share }, opts);
    const node = sectorNodes(firstLayer(spec, { share }))[0];
    const params = sectorParams(node);
    const midRadius = (params.innerRadius + params.outerRadius) / 2;
    const midAngle = (params.startAngle + params.endAngle) / 2;
    expect(locator.datum(0)?.position).toEqual(arcEndPoint(vectorPosition(node), midRadius, midAngle));
  });

  it('locator series centroid uses pulled datum anchors', () => {
    const spec = pieSpec({ kind: 'field', value: 'offset' }, { series: 'label' });
    const locator = createPlotLocator(spec, { share }, opts);
    expect(locator.series('B')?.position).toEqual(locator.datum(1)?.position);
  });
});
