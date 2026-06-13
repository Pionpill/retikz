import { compileToScene } from '@retikz/core';
import type { IRNode, IRPath, IRScope } from '@retikz/core';
import { schemeCategory10 } from 'd3-scale-chromatic';
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
  data: { reference:'sales' },
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
    data: { reference:'sales' },
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

  it('non_finite_size_throws', () => {
    // 非有限的绘图区尺寸会一路污染出 cx="NaN" 坏坐标——入口抛清晰错误而非静默出坏图
    expect(() => expandOf(lineSpec, { sales: SALES }, { width: Number.NaN, height: 300 })).toThrow(/width/);
    expect(() => expandOf(lineSpec, { sales: SALES }, { width: 480, height: Number.POSITIVE_INFINITY })).toThrow(/height/);
  });

  it('non_positive_size_throws', () => {
    expect(() => expandOf(lineSpec, { sales: SALES }, { width: 0, height: 300 })).toThrow(/width/);
    expect(() => expandOf(lineSpec, { sales: SALES }, { width: 480, height: -10 })).toThrow(/height/);
  });

  // 交互
  it('explicit_domain_range_respected', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference:'sales' },
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

  // ADR-03：绘图区布局（margin convention）
  const guidedLineSpec: PlotSpec = PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference:'sales' },
    scales: [
      { type: 'linear', name: 'xMonth' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [{ type: 'line', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
    guides: [
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y' },
    ],
  });

  it('legacy_no_guides_projection_unchanged', () => {
    // 守 alpha.1：无 guides → plot area = 整图 → 投影坐标逐字不变
    const path = (firstLayer(lineSpec, { sales: SALES }, opts).children[0] as IRPath).children;
    expect(path).toEqual([
      { type: 'step', kind: 'move', to: [0, 240] },
      { type: 'step', kind: 'line', to: [240, 0] },
      { type: 'step', kind: 'line', to: [480, 300] },
    ]);
  });

  it('mark_projects_into_plot_area', () => {
    // 有 x+y 轴 → mark 投影到缩进的 plot area：首点 x>0（左移过 left margin）、末点 x<480（右留白）
    const path = (firstLayer(guidedLineSpec, { sales: SALES }, opts).children[0] as IRPath).children;
    const firstX = (path[0] as { to: [number, number] }).to[0];
    const lastX = (path[path.length - 1] as { to: [number, number] }).to[0];
    expect(firstX).toBeGreaterThan(0);
    expect(lastX).toBeLessThan(480);
    expect(firstX).toBeLessThan(lastX);
  });

  it('explicit_range_not_overridden_by_plot_area', () => {
    // 显式 range 的 scale 即便有 axis 也不被 plot area 覆盖（尊重用户手设）
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference:'sales' },
      scales: [
        { type: 'linear', name: 'xMonth', domain: [0, 10], range: [0, 100] },
        { type: 'linear', name: 'yRevenue', domain: [0, 100], range: [100, 0] },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
      guides: [{ type: 'axis', dimension: 'x' }, { type: 'axis', dimension: 'y' }],
    });
    const layer = firstLayer(spec, { sales: [{ month: 5, revenue: 50 }] }, opts);
    expect((layer.children[0] as IRNode).position).toEqual([50, 50]);
  });
});

// ADR-02：interval(bar) mark
const barSpec = (): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference:'sales' },
    scales: [
      { type: 'band', name: 'xMonth' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [{ type: 'interval', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
  });

describe('lowerPlots interval/bar (ADR-02)', () => {
  it('bar_layer_rectangle_nodes', () => {
    const layer = firstLayer(barSpec(), { sales: SALES }, opts);
    expect(layer.children).toHaveLength(3);
    expect(layer.nodeDefault?.shape).toBe('rectangle');
    expect(layer.nodeDefault?.padding).toBe(0);
    expect(layer.nodeDefault?.strokeWidth).toBe(0);
    expect(layer.nodeDefault?.fill).toBe('currentColor');
    // 每个 node 裸（只有 type/position/minimumWidth/minimumHeight，无 shape）
    expect(layer.children.every(c => (c as IRNode).shape === undefined)).toBe(true);
  });

  it('bar_width_is_bandwidth_equal', () => {
    const widths = (firstLayer(barSpec(), { sales: SALES }, opts).children as Array<IRNode>).map(n => n.minimumWidth as number);
    expect(widths.every(w => w > 0)).toBe(true);
    expect(widths[0]).toBeCloseTo(widths[1], 6);
    expect(widths[1]).toBeCloseTo(widths[2], 6);
  });

  it('bar_height_reflects_value', () => {
    const heights = (firstLayer(barSpec(), { sales: SALES }, opts).children as Array<IRNode>).map(n => n.minimumHeight as number);
    // revenue 10/14/9 → 第二根最高、第三根最矮
    expect(heights[1]).toBeGreaterThan(heights[0]);
    expect(heights[2]).toBeLessThan(heights[0]);
  });

  it('bar_sits_on_baseline', () => {
    // 无 guides → plot area 满，baseline y(0)=300：正值柱底 center + height/2 ≈ 300
    for (const node of firstLayer(barSpec(), { sales: SALES }, opts).children as Array<IRNode>) {
      const cy = (node.position as [number, number])[1];
      expect(cy + (node.minimumHeight as number) / 2).toBeCloseTo(300, 6);
    }
  });

  it('bar_centers_ascending_evenly', () => {
    const xs = (firstLayer(barSpec(), { sales: SALES }, opts).children as Array<IRNode>).map(n => (n.position as [number, number])[0]);
    expect(xs[0]).toBeLessThan(xs[1]);
    expect(xs[1]).toBeLessThan(xs[2]);
    expect(xs[1] - xs[0]).toBeCloseTo(xs[2] - xs[1], 6);
  });

  it('bar_missing_value_skipped', () => {
    const rows = [
      { month: 0, revenue: 10 },
      { month: 1, revenue: 'oops' },
      { month: 2, revenue: 9 },
    ];
    expect(firstLayer(barSpec(), { sales: rows }, opts).children).toHaveLength(2);
  });

  it('bar_compiles_to_scene', () => {
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [barSpec()] },
      { composites: lowerPlots({ sales: SALES }, opts) },
    );
    expect(scene.primitives.length).toBeGreaterThan(0);
  });

  it('bar_coexists_with_point', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference:'sales' },
      scales: [
        { type: 'band', name: 'xMonth' },
        { type: 'linear', name: 'yRevenue' },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [
        { type: 'interval', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
        { type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
      ],
    });
    // 无 guides：两 mark → 两层 mark scope
    const outer = expandOf(spec, { sales: SALES }, opts);
    expect(outer.children).toHaveLength(2);
    expect((outer.children[0] as IRScope).nodeDefault?.shape).toBe('rectangle'); // interval 层
    expect((outer.children[1] as IRScope).nodeDefault?.shape).toBe('circle'); // point 层
  });
});

// ADR-04：ordinal·color scale + color 通道
describe('lowerPlots color (ADR-04)', () => {
  const COUNTRIES = [
    { gdp: 1, life: 70, continent: 'Asia' },
    { gdp: 2, life: 80, continent: 'Europe' },
    { gdp: 3, life: 75, continent: 'Asia' },
  ];
  const coloredPoint = (scales: Array<unknown>): PlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference:'c' },
      scales,
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'gdp' }, y: { field: 'life' }, color: { field: 'continent', scale: 'col' } } }],
    });

  it('point_color_groups_into_subscopes', () => {
    const layer = firstLayer(
      coloredPoint([
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'col', range: ['#aa', '#bb'] },
      ]),
      { c: COUNTRIES },
      opts,
    );
    // 2 类别 → 2 子 Scope（Asia 先于 Europe，按数据序）
    expect(layer.children).toHaveLength(2);
    const asia = layer.children[0] as IRScope;
    expect(asia.nodeDefault?.shape).toBe('circle');
    expect(asia.nodeDefault?.fill).toBe('#aa');
    expect(asia.children).toHaveLength(2);
    const europe = layer.children[1] as IRScope;
    expect(europe.nodeDefault?.fill).toBe('#bb');
    expect(europe.children).toHaveLength(1);
  });

  it('point_color_default_scheme', () => {
    const layer = firstLayer(
      coloredPoint([
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'col' },
      ]),
      { c: COUNTRIES },
      opts,
    );
    expect((layer.children[0] as IRScope).nodeDefault?.fill).toBe(schemeCategory10[0]);
    expect((layer.children[1] as IRScope).nodeDefault?.fill).toBe(schemeCategory10[1]);
  });

  it('point_color_auto_synthesized_scale', () => {
    // color 有 field 无 scale ref → 自动合成 ordinal 色 scale（默认配色）
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference:'c' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'gdp' }, y: { field: 'life' }, color: { field: 'continent' } } }],
    });
    const layer = firstLayer(spec, { c: COUNTRIES }, opts);
    expect(layer.children).toHaveLength(2);
    expect((layer.children[0] as IRScope).nodeDefault?.fill).toBe(schemeCategory10[0]);
  });

  it('point_color_constant_single_subscope', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference:'c' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'gdp' }, y: { field: 'life' }, color: { value: '#333' } } }],
    });
    const layer = firstLayer(spec, { c: COUNTRIES }, opts);
    expect(layer.children).toHaveLength(1);
    expect((layer.children[0] as IRScope).nodeDefault?.fill).toBe('#333');
    expect((layer.children[0] as IRScope).children).toHaveLength(3);
  });

  it('color_unknown_scale_ref_throws', () => {
    const spec = coloredPoint([
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ]);
    expect(() => expandOf(spec, { c: COUNTRIES }, opts)).toThrow(/unknown scale/);
  });

  it('color_non_ordinal_scale_ref_throws', () => {
    const spec = coloredPoint([
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
      { type: 'linear', name: 'col' },
    ]);
    expect(() => expandOf(spec, { c: COUNTRIES }, opts)).toThrow(/ordinal/);
  });

  it('line_color_constant_to_stroke', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference:'c' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'line', order: 'gdp', encoding: { x: { field: 'gdp' }, y: { field: 'life' }, color: { value: 'tomato' } } }],
    });
    expect(firstLayer(spec, { c: COUNTRIES }, opts).pathDefault?.stroke).toBe('tomato');
  });

  it('bar_color_groups_into_subscopes', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference:'c' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'col' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'interval', encoding: { x: { field: 'gdp' }, y: { field: 'life' }, color: { field: 'continent', scale: 'col' } } }],
    });
    const layer = firstLayer(spec, { c: COUNTRIES }, opts);
    expect(layer.children).toHaveLength(2);
    expect((layer.children[0] as IRScope).nodeDefault?.shape).toBe('rectangle');
  });

  it('uncolored_point_keeps_single_scope', () => {
    // 无 color：守 alpha.1 结构（单层 nodeDefault，不分子 Scope）
    expect(firstLayer(pointSpec(), { sales: SALES }, opts).nodeDefault?.shape).toBe('circle');
  });
});

// ADR-05：relation（series / dodge / stack / 多系列折线）
describe('lowerPlots relation (ADR-05)', () => {
  const SALES2 = [
    { month: 'Jan', product: 'A', revenue: 3 },
    { month: 'Jan', product: 'B', revenue: 5 },
    { month: 'Feb', product: 'A', revenue: 2 },
    { month: 'Feb', product: 'B', revenue: 4 },
  ];
  const allNodes = (layer: IRScope): Array<IRNode> =>
    layer.children.flatMap(child => (child as IRScope).children as Array<IRNode>);

  it('dodge_subbands_equal_width_offset', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference:'s' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'col' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'interval', series: 'product', encoding: { x: { field: 'month' }, y: { field: 'revenue' }, color: { field: 'product', scale: 'col' } } }],
    });
    const layer = firstLayer(spec, { s: SALES2 }, opts);
    // 2 系列 → 2 子 Scope（按颜色），共 4 柱
    expect(layer.children).toHaveLength(2);
    const nodes = allNodes(layer);
    expect(nodes).toHaveLength(4);
    // 所有子带等宽
    const widths = nodes.map(n => n.minimumWidth as number);
    expect(widths.every(w => Math.abs(w - widths[0]) < 1e-6)).toBe(true);
    // 同类别内 A（系列 0）在 B（系列 1）左侧：A.Jan.x < B.Jan.x
    const seriesA = layer.children[0] as IRScope;
    const seriesB = layer.children[1] as IRScope;
    const aJanX = ((seriesA.children[0] as IRNode).position as [number, number])[0];
    const bJanX = ((seriesB.children[0] as IRNode).position as [number, number])[0];
    expect(aJanX).toBeLessThan(bJanX);
  });

  it('stack_bars_from_transform', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference:'s' },
      transform: [{ kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' }],
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'col' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'interval', series: 'product', arrangement: 'stack', encoding: { x: { field: 'month' }, y: { field: 'revenue' }, color: { field: 'product', scale: 'col' } } }],
    });
    const layer = firstLayer(spec, { s: SALES2 }, opts);
    const nodes = allNodes(layer);
    expect(nodes).toHaveLength(4);
    // 全宽柱（堆叠不切子带）：宽度都相等
    const widths = nodes.map(n => n.minimumWidth as number);
    expect(widths.every(w => Math.abs(w - widths[0]) < 1e-6)).toBe(true);
    // Jan：B（值更高、堆在上）中心像素 < A（y 屏幕向下，越高像素越小）
    const aJan = (layer.children[0] as IRScope).children[0] as IRNode; // 系列 A
    const bJan = (layer.children[1] as IRScope).children[0] as IRNode; // 系列 B
    expect((bJan.position as [number, number])[1]).toBeLessThan((aJan.position as [number, number])[1]);
  });

  it('stack_without_transform_throws', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference:'s' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'interval', series: 'product', arrangement: 'stack', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
    });
    expect(() => expandOf(spec, { s: SALES2 }, opts)).toThrow(/stack transform/);
  });

  it('line_series_multi_paths', () => {
    const TREND = [
      { t: 0, v: 1, city: 'X' },
      { t: 1, v: 3, city: 'X' },
      { t: 0, v: 2, city: 'Y' },
      { t: 1, v: 4, city: 'Y' },
    ];
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference:'t' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'col', range: ['#aa', '#bb'] },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'line', series: 'city', order: 't', encoding: { x: { field: 't' }, y: { field: 'v' }, color: { field: 'city', scale: 'col' } } }],
    });
    const layer = firstLayer(spec, { t: TREND }, opts);
    // 2 系列 → 2 条 Path，各自一色
    expect(layer.children).toHaveLength(2);
    expect((layer.children[0] as IRPath).type).toBe('path');
    expect((layer.children[0] as IRPath & { stroke?: string }).stroke).toBe('#aa');
    expect((layer.children[1] as IRPath & { stroke?: string }).stroke).toBe('#bb');
  });

  it('series_omitted_single_bar_layer', () => {
    // 无 series → 退化普通柱（单层 nodeDefault）
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference:'s' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'interval', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
    });
    const layer = firstLayer(spec, { s: SALES2 }, opts);
    expect(layer.nodeDefault?.shape).toBe('rectangle');
  });

  it('stacked_bar_compiles_to_scene', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference:'s' },
      transform: [{ kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' }],
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'col' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'interval', series: 'product', arrangement: 'stack', encoding: { x: { field: 'month' }, y: { field: 'revenue' }, color: { field: 'product', scale: 'col' } } }],
      guides: [{ type: 'axis', dimension: 'x' }, { type: 'axis', dimension: 'y', grid: true }],
    });
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [spec] },
      { composites: lowerPlots({ s: SALES2 }, opts) },
    );
    expect(scene.primitives.length).toBeGreaterThan(0);
  });
});
