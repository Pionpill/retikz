import type { IRNode, IRScope } from '@retikz/core';
import { DEFAULT_EPSILON } from '@retikz/math';
import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import { lowerPlot } from '../../../src/pipeline/expand/lower';
import { OPACITY_MIN } from '../../../src/providers';
import type { IRPlot, IRPlotChannel } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

const cartOpts: LowerPlotsOptions = { layout: { width: 480, height: 300 } };

const expandOf = (spec: IRPlot, datasets: Record<string, Array<Record<string, unknown>>>): IRScope => {
  return lowerPlot(spec, datasets, { ...cartOpts, textMeasurer: measureLabel }) as IRScope;
};

const firstLayer = (spec: IRPlot, datasets: Record<string, Array<Record<string, unknown>>>): IRScope =>
  expandOf(spec, datasets).children[0] as IRScope;

const collectNodes = (layer: IRScope): Array<IRNode> => {
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

const opacityOf = (node: IRNode): number | undefined =>
  typeof node.style?.opacity === 'number' ? node.style.opacity : node.style?.opacity?.overall;

const pointSpec = (opacity: IRPlotChannel | number | undefined): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x', domainPadding: 0 },
      { type: 'linear', name: 'y', domainPadding: 0 },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'point',

        kind: 'data',
        encodings: {
          position: { x: 'x', y: 'y' },
          ...(typeof opacity === 'number' || opacity === undefined ? {} : { opacity: { overall: opacity } }),
        },
        properties: typeof opacity === 'number' ? { opacity: { overall: opacity } } : {},
      },
    ],
  });

describe('opacity channel (contract)', () => {
  // Happy path：linear 映射到 [OPACITY_MIN, 1]。domain [0,10]：v=0→min、v=10→1、v=5→中点
  it('opacity_field_maps_to_min_one', () => {
    const data = [
      { x: 0, y: 0, d: 0 },
      { x: 1, y: 1, d: 5 },
      { x: 2, y: 2, d: 10 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec('d'), { d: data }));
    const ops = nodes.map(opacityOf);

    expect(ops[0]).toBeCloseTo(OPACITY_MIN, 6);
    expect(ops[2]).toBeCloseTo(1, 6);
    expect(ops[1]).toBeCloseTo(OPACITY_MIN + 0.5 * (1 - OPACITY_MIN), 6);
  });

  it('opacity_explicit_scale_ignores_position_domain_padding', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
        { type: 'linear', name: 'alpha', domainPadding: 1 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          kind: 'data',
          encodings: { position: { x: 'x', y: 'y' }, opacity: { overall: { field: 'd', scale: 'alpha' } } },
        },
      ],
    });
    const nodes = collectNodes(
      firstLayer(spec, {
        d: [
          { x: 0, y: 0, d: 0 },
          { x: 1, y: 1, d: 10 },
        ],
      }),
    );

    expect(opacityOf(nodes[0])).toBeCloseTo(OPACITY_MIN, 6);
    expect(opacityOf(nodes[1])).toBeCloseTo(1, 6);
  });

  it('opacity_value_constant', () => {
    const data = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const layer = firstLayer(pointSpec(0.4), { d: data });

    expect(layer.defaults?.node?.style?.opacity).toEqual({ overall: 0.4 });
    expect(collectNodes(layer).every(n => opacityOf(n) === 0.4)).toBe(true);
  });

  // 边界：field 越界 clamp 不报错（负值 → OPACITY_MIN）
  it('opacity_field_out_of_range_clamps', () => {
    // domain 推断为 [-5, 5]；但加一个远离点测 clamp 不直观，这里验证不抛 + 落在 [min,1]
    const data = [
      { x: 0, y: 0, d: -5 },
      { x: 1, y: 1, d: 5 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec('d'), { d: data }));

    expect(
      nodes.every(n => opacityOf(n)! >= OPACITY_MIN - DEFAULT_EPSILON && opacityOf(n)! <= 1 + DEFAULT_EPSILON),
    ).toBe(true);
  });

  it('opacity_no_channel_no_opacity', () => {
    const data = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec(undefined), { d: data }));

    expect(nodes.every(n => opacityOf(n) === undefined)).toBe(true);
  });

  // 错误路径：temporal 字段 fail-loud
  it('opacity_temporal_field_fails_loud', () => {
    const data = [
      { x: 0, y: 0, t: '2024-01-01' },
      { x: 1, y: 1, t: '2024-02-01' },
    ];

    expect(() => expandOf(pointSpec('t'), { d: data })).toThrow(/opacity requires a continuous field/);
  });

  // 交互：size + opacity 共存，各自 per-node
  it('opacity_with_size_both_per_node', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          kind: 'data',
          encodings: { size: 'p', position: { x: 'x', y: 'y' }, opacity: { overall: 'd' } },
        },
      ],
    });
    const data = [
      { x: 0, y: 0, p: 1, d: 2 },
      { x: 1, y: 1, p: 4, d: 8 },
    ];
    const nodes = collectNodes(firstLayer(spec, { d: data }));

    expect(nodes.every(n => opacityOf(n) !== undefined && n.layout?.minimumSize !== undefined)).toBe(true);
  });
});

it('opacity members resolve independent fields and named scales', () => {
  const spec = pointSpec(undefined);
  spec.scales.push(
    { type: 'linear', name: 'overall-alpha', domain: [0, 10] },
    { type: 'linear', name: 'fill-alpha', domain: [0, 100] },
    { type: 'linear', name: 'stroke-alpha', domain: [0, 1] },
  );
  spec.marks = [
    {
      type: 'point',
      kind: 'data',
      encodings: {
        position: { x: 'x', y: 'y' },
        opacity: {
          overall: { field: 'a', scale: 'overall-alpha' },
          fill: { field: 'b', scale: 'fill-alpha' },
          stroke: { field: 'c', scale: 'stroke-alpha' },
        },
      },
    },
  ];
  const nodes = collectNodes(
    firstLayer(spec, {
      d: [
        { x: 0, y: 0, a: 0, b: 100, c: 0.5 },
        { x: 1, y: 1, a: 10, b: 0, c: 1 },
      ],
    }),
  );
  expect(nodes[0].style?.opacity).toEqual({ overall: OPACITY_MIN, fill: 1, stroke: 0.6 });
  expect(nodes[1].style?.opacity).toEqual({ overall: 1, fill: OPACITY_MIN, stroke: 1 });
});
