import type { IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { PLOT_SHAPE_PALETTE } from '../../src/lower/channel';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';

const cartOpts: LowerPlotsOptions = { width: 480, height: 300 };

const expandOf = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>): IRScope => {
  const [def] = lowerPlots(datasets, cartOpts);
  return def.expand(spec) as IRScope;
};

const firstLayer = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>): IRScope => expandOf(spec, datasets).children[0] as IRScope;

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

const shapeOf = (node: IRNode): string | undefined => (node as { shape?: string }).shape;

const pointSpec = (shape: Record<string, unknown> | undefined): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, ...(shape ? { shape } : {}) } }],
  });

describe('shape channel (alpha.7 ADR-05)', () => {
  // Happy path：分类 → 调色板（按出现序）
  it('shape_field_maps_categories_to_palette', () => {
    const data = [{ x: 0, y: 0, g: 'A' }, { x: 1, y: 1, g: 'B' }, { x: 2, y: 2, g: 'A' }];
    const nodes = collectNodes(firstLayer(pointSpec({ field: 'g' }), { d: data }));
    expect(shapeOf(nodes[0])).toBe(PLOT_SHAPE_PALETTE[0]); // A → 第 0 个
    expect(shapeOf(nodes[1])).toBe(PLOT_SHAPE_PALETTE[1]); // B → 第 1 个
    expect(shapeOf(nodes[2])).toBe(PLOT_SHAPE_PALETTE[0]); // A 复用
  });

  // 调色板循环：类别数 > 调色板长度
  it('shape_palette_cycles', () => {
    const cats = ['A', 'B', 'C', 'D']; // 4 类 > 3 调色板
    const data = cats.map((g, i) => ({ x: i, y: i, g }));
    const nodes = collectNodes(firstLayer(pointSpec({ field: 'g' }), { d: data }));
    expect(shapeOf(nodes[3])).toBe(PLOT_SHAPE_PALETTE[3 % PLOT_SHAPE_PALETTE.length]); // D → 循环回第 0 个
  });

  it('shape_value_constant', () => {
    const data = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    const nodes = collectNodes(firstLayer(pointSpec({ value: 'diamond' }), { d: data }));
    expect(nodes.every(n => shapeOf(n) === 'diamond')).toBe(true);
  });

  it('shape_no_channel_no_shape_override', () => {
    const data = [{ x: 0, y: 0 }];
    // 无 shape 通道 → node 不带 shape（走 nodeDefault 默认 circle）
    const nodes = collectNodes(firstLayer(pointSpec(undefined), { d: data }));
    expect(nodes.every(n => shapeOf(n) === undefined)).toBe(true);
  });

  // 错误路径：continuous / temporal fail-loud
  it('shape_continuous_field_fails_loud', () => {
    const data = [{ x: 0, y: 0, v: 1.5 }, { x: 1, y: 1, v: 2.5 }];
    expect(() => expandOf(pointSpec({ field: 'v' }), { d: data })).toThrow(/shape requires a categorical field/);
  });

  it('shape_temporal_field_fails_loud', () => {
    const data = [{ x: 0, y: 0, t: '2024-01-01' }, { x: 1, y: 1, t: '2024-02-01' }];
    expect(() => expandOf(pointSpec({ field: 't' }), { d: data })).toThrow(/shape requires a categorical field/);
  });

  // 交互：shape + color + size 共存
  it('shape_with_color_and_size_coexist', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, { type: 'ordinal', name: 'col' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, shape: { field: 'g' }, size: { field: 'p' }, color: { field: 'g', scale: 'col' } } }],
    });
    const data = [{ x: 0, y: 0, g: 'A', p: 1 }, { x: 1, y: 1, g: 'B', p: 4 }];
    const nodes = collectNodes(firstLayer(spec, { d: data }));
    expect(nodes.every(n => shapeOf(n) !== undefined && (n as { minimumSize?: number }).minimumSize !== undefined)).toBe(true);
  });
});
