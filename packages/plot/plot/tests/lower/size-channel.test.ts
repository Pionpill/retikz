import type { IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { SIZE_MAX_RADIUS, SIZE_MIN_RADIUS } from '../../src/lower/channel';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';

const cartOpts: LowerPlotsOptions = { width: 480, height: 300 };

const expandOf = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, options: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

const firstLayer = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, options: LowerPlotsOptions): IRScope =>
  expandOf(spec, datasets, options).children[0] as IRScope;

/** 深度收集图层内所有 node（无 color 直接子、有 color 藏子 Scope） */
const collectNodes = (layer: IRScope): Array<IRNode> => {
  const out: Array<IRNode> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'node') out.push(node as unknown as IRNode);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

/** node 的 minimumSize（per-node 半径换算结果，= radius × √2） */
const sizeOf = (node: IRNode): number | undefined => (node as { minimumSize?: number }).minimumSize;
const radiusOf = (node: IRNode): number | undefined => {
  const ms = sizeOf(node);
  return ms === undefined ? undefined : ms / Math.SQRT2;
};

const pointSpec = (size: Record<string, unknown> | undefined, extraScales: Array<Record<string, unknown>> = []): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, ...extraScales],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, ...(size ? { size } : {}) } }],
  });

describe('size channel · radius geometry (alpha.7 ADR-02)', () => {
  // Happy path：sqrt 半径。domain [0,16] range [MIN,MAX]：v=4 → sqrt(4)/sqrt(16)=0.5 → 半径 = MIN + 0.5*(MAX-MIN)
  it('size_field_maps_radius_by_sqrt', () => {
    const data = [{ x: 0, y: 0, p: 0 }, { x: 1, y: 1, p: 4 }, { x: 2, y: 2, p: 16 }];
    const nodes = collectNodes(firstLayer(pointSpec({ field: 'p' }), { d: data }, cartOpts));
    const radii = nodes.map(radiusOf);
    expect(radii[0]).toBeCloseTo(SIZE_MIN_RADIUS, 6); // p=0 → 域下界 → MIN
    expect(radii[2]).toBeCloseTo(SIZE_MAX_RADIUS, 6); // p=16 = maxPositive → MAX
    const mid = SIZE_MIN_RADIUS + 0.5 * (SIZE_MAX_RADIUS - SIZE_MIN_RADIUS);
    expect(radii[1]).toBeCloseTo(mid, 6); // p=4 → sqrt 中点
  });

  // Happy path：常量 value = 最终半径，绕过 scale
  it('size_value_is_final_radius_bypassing_scale', () => {
    const data = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    const nodes = collectNodes(firstLayer(pointSpec({ value: 8 }), { d: data }, cartOpts));
    expect(nodes.every(n => radiusOf(n) !== undefined && Math.abs(radiusOf(n)! - 8) < 1e-6)).toBe(true);
  });

  // Happy path：size + color 独立生效（半径 per-node、颜色按色分组）
  it('size_with_color_both_apply', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, { type: 'ordinal', name: 'col' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, size: { field: 'p' }, color: { field: 'g', scale: 'col' } } }],
    });
    const data = [{ x: 0, y: 0, p: 1, g: 'a' }, { x: 1, y: 1, p: 4, g: 'b' }];
    const nodes = collectNodes(firstLayer(spec, { d: data }, cartOpts));
    expect(nodes).toHaveLength(2);
    expect(nodes.every(n => radiusOf(n) !== undefined)).toBe(true);
  });
});

describe('size channel · boundaries (alpha.7 ADR-02 ③)', () => {
  it('no_positive_values_all_min_radius', () => {
    const data = [{ x: 0, y: 0, p: 0 }, { x: 1, y: 1, p: 0 }];
    const nodes = collectNodes(firstLayer(pointSpec({ field: 'p' }), { d: data }, cartOpts));
    expect(nodes.every(n => Math.abs(radiusOf(n)! - SIZE_MIN_RADIUS) < 1e-6)).toBe(true);
  });

  it('single_positive_value_maps_to_range_top', () => {
    const data = [{ x: 0, y: 0, p: 7 }, { x: 1, y: 1, p: 7 }];
    const nodes = collectNodes(firstLayer(pointSpec({ field: 'p' }), { d: data }, cartOpts));
    expect(nodes.every(n => Math.abs(radiusOf(n)! - SIZE_MAX_RADIUS) < 1e-6)).toBe(true);
  });

  it('empty_data_no_nodes', () => {
    const outer = expandOf(pointSpec({ field: 'p' }), { d: [] }, cartOpts);
    expect(outer.children).toHaveLength(0);
  });

  it('no_size_channel_keeps_default_uniform_size', () => {
    const data = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    // 无 size → per-node 不设 minimumSize（走 nodeDefault 默认尺寸）
    const nodes = collectNodes(firstLayer(pointSpec(undefined), { d: data }, cartOpts));
    expect(nodes.every(n => sizeOf(n) === undefined)).toBe(true);
  });
});

describe('size channel · errors (alpha.7 ADR-02)', () => {
  it('negative_field_value_fails_loud', () => {
    const data = [{ x: 0, y: 0, p: 1 }, { x: 1, y: 1, p: -3 }];
    expect(() => expandOf(pointSpec({ field: 'p' }), { d: data }, cartOpts)).toThrow(/negative/);
  });

  it('unknown_size_scale_fails_loud', () => {
    const data = [{ x: 0, y: 0, p: 1 }];
    expect(() => expandOf(pointSpec({ field: 'p', scale: 'nope' }), { d: data }, cartOpts)).toThrow(/unknown scale/);
  });

  it('non_sqrt_size_scale_fails_loud', () => {
    const data = [{ x: 0, y: 0, p: 1 }, { x: 1, y: 1, p: 4 }];
    const spec = pointSpec({ field: 'p', scale: 'mySize' }, [{ type: 'linear', name: 'mySize' }]);
    expect(() => expandOf(spec, { d: data }, cartOpts)).toThrow(/must be a sqrt scale/);
  });
});
