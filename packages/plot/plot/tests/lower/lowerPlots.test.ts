import { compileToScene } from '@retikz/core';
import type { IRNode, IRPath, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';

const SALES = [
  { month: 0, revenue: 10 },
  { month: 1, revenue: 14 },
  { month: 2, revenue: 9 },
];

const lineSpec: PlotSpec = PlotSpecSchema.parse({
  namespace: 'plot',
  type: 'plot',
  data: { ref: 'sales' },
  scales: [
    { type: 'linear', name: 'xMonth' },
    { type: 'linear', name: 'yRevenue' },
  ],
  coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
  marks: [{ type: 'line', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
});

const pointSpec = (): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { ref: 'sales' },
    scales: [
      { type: 'linear', name: 'xMonth' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
  });

const expandOf = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, options?: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

/** 取第一个 mark 图层 scope（外层 plot scope 的第一个子 scope） */
const firstLayer = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, options?: LowerPlotsOptions): IRScope =>
  expandOf(spec, datasets, options).children[0] as IRScope;

const opts: LowerPlotsOptions = { width: 480, height: 300 };

describe('lowerPlots (ADR-06)', () => {
  // Happy path
  it('marks_become_layer_scopes', () => {
    const outer = expandOf(lineSpec, { sales: SALES }, opts);
    expect(outer.type).toBe('scope');
    expect(outer.localNamespace).toBe(true);
    // 每个 mark 下沉成一层独立 scope
    expect((outer.children[0] as IRScope).type).toBe('scope');
  });

  it('lower_line_produces_path', () => {
    const layer = firstLayer(lineSpec, { sales: SALES }, opts);
    const path = layer.children[0] as IRPath;
    expect(path.type).toBe('path');
    // 样式上提到图层 pathDefault，path 本身只留几何
    expect(layer.pathDefault?.strokeWidth).toBe(2);
    // domain x [0,2]->[0,480]; y [9,14]->[300,0]
    expect(path.children).toEqual([
      { type: 'step', kind: 'move', to: [0, 240] },
      { type: 'step', kind: 'line', to: [240, 0] },
      { type: 'step', kind: 'line', to: [480, 300] },
    ]);
  });

  it('lower_point_produces_bare_nodes_with_hoisted_style', () => {
    const layer = firstLayer(pointSpec(), { sales: SALES }, opts);
    expect(layer.children).toHaveLength(3);
    // 样式上提：circle / fill 在图层 nodeDefault，不重复写在每个 node
    expect(layer.nodeDefault?.shape).toBe('circle');
    expect(layer.nodeDefault?.fill).toBe('currentColor');
    // 每个 node 是裸的（只有 type + position，无 shape/fill）
    expect(layer.children.every(c => (c as IRNode).shape === undefined)).toBe(true);
    expect((layer.children[0] as IRNode).position).toEqual([0, 240]);
  });

  it('compile_line_to_scene_ok', () => {
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [lineSpec] },
      { composites: lowerPlots({ sales: SALES }, opts) },
    );
    expect(scene).toBeTruthy();
    expect(Array.isArray(scene.primitives)).toBe(true);
    expect(scene.primitives.length).toBeGreaterThan(0);
  });

  it('compile_point_to_scene_ok', () => {
    // 验证样式上提后 nodeDefault 仍级联出可渲染的散点
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [pointSpec()] },
      { composites: lowerPlots({ sales: SALES }, opts) },
    );
    expect(scene.primitives.length).toBeGreaterThan(0);
  });

  // 边界
  it('domain_inferred_from_data', () => {
    const layer = firstLayer(pointSpec(), { sales: SALES }, opts);
    // 端点：month 0 -> x 0；month 2 -> x 480
    const xs = layer.children.map(c => ((c as IRNode).position as [number, number])[0]);
    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(480);
  });

  it('lower_single_datum_point', () => {
    const layer = firstLayer(pointSpec(), { sales: [{ month: 1, revenue: 5 }] }, opts);
    expect(layer.children).toHaveLength(1);
  });

  // 错误路径
  it('ref_not_in_datasets_throws', () => {
    expect(() => expandOf(lineSpec, { other: SALES }, opts)).toThrow(/sales/);
  });

  it('non_finite_field_skipped', () => {
    const rows = [
      { month: 0, revenue: 10 },
      { month: 'oops', revenue: 14 },
      { month: 2, revenue: 9 },
    ];
    const layer = firstLayer(pointSpec(), { sales: rows }, opts);
    expect(layer.children).toHaveLength(2); // 非有限 x 的那行被跳过
  });

  // 交互
  it('explicit_domain_range_respected', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { ref: 'sales' },
      scales: [
        { type: 'linear', name: 'xMonth', domain: [0, 10], range: [0, 100] },
        { type: 'linear', name: 'yRevenue', domain: [0, 100], range: [100, 0] },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
    });
    const layer = firstLayer(spec, { sales: [{ month: 5, revenue: 50 }] }, opts);
    // x: 5/10*100=50; y: 100 + 50/100*(0-100)=50
    expect((layer.children[0] as IRNode).position).toEqual([50, 50]);
  });

  it('order_field_sorts_line', () => {
    const shuffled = [
      { month: 2, revenue: 9 },
      { month: 0, revenue: 10 },
      { month: 1, revenue: 14 },
    ];
    const layer = firstLayer(lineSpec, { sales: shuffled }, opts);
    const path = layer.children[0] as IRPath;
    // 首点应是 month 最小 (=0) -> x 0
    expect(path.children[0]).toEqual({ type: 'step', kind: 'move', to: [0, 240] });
  });
});
