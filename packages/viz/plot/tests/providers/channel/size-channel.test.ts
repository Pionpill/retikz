import type { IRNode, IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import type { IRPlotSpec } from '../../../src/schemas';

import { lowerPlots } from '../../../src/pipeline/expand';
import { SIZE_MAX_RADIUS, SIZE_MIN_RADIUS } from '../../../src/providers';
import { PlotSpecSchema } from '../../../src/schemas';

const cartOpts: LowerPlotsOptions = { width: 480, height: 300 };

const expandOf = (
  spec: IRPlotSpec,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: LowerPlotsOptions,
): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

const firstLayer = (
  spec: IRPlotSpec,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: LowerPlotsOptions,
): IRScope => expandOf(spec, datasets, options).children[0] as IRScope;

/** 深度收集图层内所有 Node；颜色分组时 Node 可能位于子 Scope */
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

/** 读取 Node.minimumSize；它等于逐节点半径乘以 √2 */
const sizeOf = (node: IRNode): number | undefined => (node as { minimumSize?: number }).minimumSize;
const radiusOf = (node: IRNode): number | undefined => {
  const ms = sizeOf(node);
  return ms === undefined ? undefined : ms / Math.SQRT2;
};

const pointSpec = (
  size: { kind: 'field'; value: string; scale?: string } | { kind: 'constant'; value: number } | undefined,
  extraScales: Array<Record<string, unknown>> = [],
): IRPlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, ...extraScales],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', ...(size ? { size } : {}), encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
  });

describe('size channel 映射节点半径', () => {
  // sqrt 半径映射：domain [0,16]、range [MIN,MAX] 时，v=4 映射到半程半径
  it('size_field_maps_radius_by_sqrt', () => {
    const data = [
      { x: 0, y: 0, p: 0 },
      { x: 1, y: 1, p: 4 },
      { x: 2, y: 2, p: 16 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec({ kind: 'field', value: 'p' }), { d: data }, cartOpts));
    const radii = nodes.map(radiusOf);
    expect(radii[0]).toBeCloseTo(SIZE_MIN_RADIUS, 6); // p=0 位于 domain 下界，映射到 MIN
    expect(radii[2]).toBeCloseTo(SIZE_MAX_RADIUS, 6); // p=16 是最大正值，映射到 MAX
    const mid = SIZE_MIN_RADIUS + 0.5 * (SIZE_MAX_RADIUS - SIZE_MIN_RADIUS);
    expect(radii[1]).toBeCloseTo(mid, 6); // p=4 是 sqrt 映射的中点
  });

  // 常量 value 直接表示最终半径，不经过 scale
  it('size_value_is_final_radius_bypassing_scale', () => {
    const data = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec({ kind: 'constant', value: 8 }), { d: data }, cartOpts));
    expect(nodes.every(n => radiusOf(n) !== undefined && Math.abs(radiusOf(n)! - 8) < 1e-6)).toBe(true);
  });

  // size 与 color 独立生效：半径逐节点解析，颜色按值分组
  it('size_with_color_both_apply', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'col' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          size: { kind: 'field', value: 'p' },
          color: { kind: 'field', value: 'g', scale: 'col' },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
    });
    const data = [
      { x: 0, y: 0, p: 1, g: 'a' },
      { x: 1, y: 1, p: 4, g: 'b' },
    ];
    const nodes = collectNodes(firstLayer(spec, { d: data }, cartOpts));
    expect(nodes).toHaveLength(2);
    expect(nodes.every(n => radiusOf(n) !== undefined)).toBe(true);
  });
});

describe('size channel 边界输入', () => {
  it('no_positive_values_all_min_radius', () => {
    const data = [
      { x: 0, y: 0, p: 0 },
      { x: 1, y: 1, p: 0 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec({ kind: 'field', value: 'p' }), { d: data }, cartOpts));
    expect(nodes.every(n => Math.abs(radiusOf(n)! - SIZE_MIN_RADIUS) < 1e-6)).toBe(true);
  });

  it('single_positive_value_maps_to_range_top', () => {
    const data = [
      { x: 0, y: 0, p: 7 },
      { x: 1, y: 1, p: 7 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec({ kind: 'field', value: 'p' }), { d: data }, cartOpts));
    expect(nodes.every(n => Math.abs(radiusOf(n)! - SIZE_MAX_RADIUS) < 1e-6)).toBe(true);
  });

  it('empty_data_no_nodes', () => {
    const outer = expandOf(pointSpec({ kind: 'field', value: 'p' }), { d: [] }, cartOpts);
    expect(outer.children).toHaveLength(0);
  });

  it('no_size_channel_keeps_default_uniform_size', () => {
    const data = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec(undefined), { d: data }, cartOpts));
    expect(nodes.every(n => sizeOf(n) === undefined)).toBe(true);
  });
});

describe('size channel 错误输入', () => {
  it('negative_field_value_fails_loud', () => {
    const data = [
      { x: 0, y: 0, p: 1 },
      { x: 1, y: 1, p: -3 },
    ];
    expect(() => expandOf(pointSpec({ kind: 'field', value: 'p' }), { d: data }, cartOpts)).toThrow(/negative/);
  });

  it('unknown_size_scale_fails_loud', () => {
    const data = [{ x: 0, y: 0, p: 1 }];
    expect(() => expandOf(pointSpec({ kind: 'field', value: 'p', scale: 'nope' }), { d: data }, cartOpts)).toThrow(
      /unknown scale/,
    );
  });

  it('non_sqrt_size_scale_fails_loud', () => {
    const data = [
      { x: 0, y: 0, p: 1 },
      { x: 1, y: 1, p: 4 },
    ];
    const spec = pointSpec({ kind: 'field', value: 'p', scale: 'mySize' }, [{ type: 'linear', name: 'mySize' }]);
    expect(() => expandOf(spec, { d: data }, cartOpts)).toThrow(/must be a sqrt scale/);
  });
});
