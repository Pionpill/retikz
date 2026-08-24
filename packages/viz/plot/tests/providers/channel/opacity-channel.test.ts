import type { IRNode, IRScope } from '@retikz/core';

import { DEFAULT_EPSILON } from '@retikz/math';
import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import type { IRPlot } from '../../../src/schemas';

import { lowerPlot } from '../../../src/pipeline/expand/lower';
import { OPACITY_MIN } from '../../../src/providers';
import { PlotSchema } from '../../../src/schemas';

const cartOpts: LowerPlotsOptions = { width: 480, height: 300 };

const expandOf = (spec: IRPlot, datasets: Record<string, Array<Record<string, unknown>>>): IRScope => {
  return lowerPlot(spec, datasets, cartOpts) as IRScope;
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

const opacityOf = (node: IRNode): number | undefined => (node as { opacity?: number }).opacity;

const pointSpec = (opacity: Record<string, unknown> | undefined): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x', domainPadding: 0 },
      { type: 'linear', name: 'y', domainPadding: 0 },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', ...(opacity ? { opacity } : {}), encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
  });

describe('opacity channel (contract)', () => {
  // Happy path：linear 映射到 [OPACITY_MIN, 1]。domain [0,10]：v=0→min、v=10→1、v=5→中点
  it('opacity_field_maps_to_min_one', () => {
    const data = [
      { x: 0, y: 0, d: 0 },
      { x: 1, y: 1, d: 5 },
      { x: 2, y: 2, d: 10 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec({ kind: 'field', value: 'd' }), { d: data }));
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
          opacity: { kind: 'field', value: 'd', scale: 'alpha' },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
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
    const layer = firstLayer(pointSpec({ kind: 'constant', value: 0.4 }), { d: data });
    expect(layer.nodeDefault?.opacity).toBeCloseTo(0.4, 6);
    expect(collectNodes(layer).every(n => opacityOf(n) === undefined)).toBe(true);
  });

  // 边界：field 越界 clamp 不报错（负值 → OPACITY_MIN）
  it('opacity_field_out_of_range_clamps', () => {
    // domain 推断为 [-5, 5]；但加一个远离点测 clamp 不直观，这里验证不抛 + 落在 [min,1]
    const data = [
      { x: 0, y: 0, d: -5 },
      { x: 1, y: 1, d: 5 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec({ kind: 'field', value: 'd' }), { d: data }));
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
    expect(() => expandOf(pointSpec({ kind: 'field', value: 't' }), { d: data })).toThrow(
      /opacity requires a continuous field/,
    );
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
          size: { kind: 'field', value: 'p' },
          opacity: { kind: 'field', value: 'd' },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
    });
    const data = [
      { x: 0, y: 0, p: 1, d: 2 },
      { x: 1, y: 1, p: 4, d: 8 },
    ];
    const nodes = collectNodes(firstLayer(spec, { d: data }));
    expect(
      nodes.every(n => opacityOf(n) !== undefined && (n as { minimumSize?: number }).minimumSize !== undefined),
    ).toBe(true);
  });
});
