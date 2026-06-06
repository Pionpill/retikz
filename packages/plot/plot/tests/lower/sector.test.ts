import type { IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';

/** 正方形画布 → outerRadius = min(w,h)/2 = 200、center = [200,200]（无角向轴 → margin 0） */
const opts: LowerPlotsOptions = { width: 400, height: 400 };

const expandOf = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, options: LowerPlotsOptions = opts): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

/** 取第一个 mark 图层 scope */
const firstLayer = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, options: LowerPlotsOptions = opts): IRScope =>
  expandOf(spec, datasets, options).children[0] as IRScope;

/** 深度收集图层内所有 sector node（无 color 时直接子，有 color 时藏在子 Scope 里） */
const sectorNodes = (layer: IRScope): Array<IRNode> => {
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

/** 读 sector node 的 shape params（断言其确为 sector shape ref） */
const sectorParams = (node: IRNode): { innerRadius: number; outerRadius: number; startAngle: number; endAngle: number } => {
  const shape = node.shape as { type?: string; params?: Record<string, number> } | undefined;
  expect(shape?.type).toBe('sector');
  return shape!.params as { innerRadius: number; outerRadius: number; startAngle: number; endAngle: number };
};

// ── interval polar → sector（径向柱 / 玫瑰）─────────────────────────────
describe('lowerPlots interval→sector under polar2D (ADR-02)', () => {
  const SALES = [
    { month: 'Jan', amount: 3 },
    { month: 'Feb', amount: 6 },
    { month: 'Mar', amount: 9 },
  ];
  const roseSpec = (): PlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      coordinate: { type: 'polar2D', angle: 'cat', radius: 'val' },
      scales: [
        { type: 'band', name: 'cat' },
        { type: 'linear', name: 'val' },
      ],
      marks: [{ type: 'interval', encoding: { x: { field: 'month' }, y: { field: 'amount' } } }],
    });

  it('rose_each_row_one_sector_node', () => {
    const layer = firstLayer(roseSpec(), { sales: SALES });
    const nodes = sectorNodes(layer);
    expect(nodes).toHaveLength(3);
    for (const node of nodes) {
      const params = sectorParams(node);
      // 所有 sector 共享圆心 position
      expect(node.position).toEqual([200, 200]);
      // core 硬约束：outerRadius > innerRadius
      expect(params.outerRadius).toBeGreaterThan(params.innerRadius);
    }
  });

  it('rose_inner_radius_is_radius_baseline', () => {
    // innerRadius=0（实心）→ 半径基线 radiusScale(0) = innerRadiusUnits = 0
    const params = sectorNodes(firstLayer(roseSpec(), { sales: SALES })).map(sectorParams);
    for (const p of params) expect(p.innerRadius).toBeCloseTo(0, 6);
  });

  it('rose_outer_radius_encodes_value', () => {
    // 半径编码值：amount 3 < 6 < 9 → outerRadius 单调递增
    const outer = sectorNodes(firstLayer(roseSpec(), { sales: SALES })).map(n => sectorParams(n).outerRadius);
    expect(outer[0]).toBeLessThan(outer[1]);
    expect(outer[1]).toBeLessThan(outer[2]);
    // 最大值（amount 9 = domain max）满铺到 outerRadius=200
    expect(Math.max(...outer)).toBeCloseTo(200, 6);
  });

  it('rose_band_angles_equal_arc_per_category', () => {
    // 3 类别等分整圆 → 每片角带宽相等（band bandwidth）
    const params = sectorNodes(firstLayer(roseSpec(), { sales: SALES })).map(sectorParams);
    const arcs = params.map(p => p.endAngle - p.startAngle);
    expect(arcs[0]).toBeCloseTo(arcs[1], 6);
    expect(arcs[1]).toBeCloseTo(arcs[2], 6);
    expect(arcs[0]).toBeGreaterThan(0);
  });

  it('rose_single_category_occupies_full_band', () => {
    const layer = firstLayer(roseSpec(), { sales: [{ month: 'Jan', amount: 5 }] });
    const nodes = sectorNodes(layer);
    expect(nodes).toHaveLength(1);
    const params = sectorParams(nodes[0]);
    expect(params.endAngle - params.startAngle).toBeGreaterThan(0);
  });

  it('rose_negative_value_swaps_to_keep_outer_gt_inner', () => {
    // 负值径向柱：value 跨 baseline，swap 保证 outerRadius > innerRadius（core 硬约束）
    const params = sectorNodes(firstLayer(roseSpec(), { sales: [{ month: 'A', amount: -4 }, { month: 'B', amount: 8 }] })).map(sectorParams);
    for (const p of params) expect(p.outerRadius).toBeGreaterThan(p.innerRadius);
  });

  it('rose_empty_data_yields_no_layer', () => {
    const outer = expandOf(roseSpec(), { sales: [] });
    // 无可绘制 sector → mark 图层被丢弃（children 为空）
    expect(outer.children).toHaveLength(0);
  });

  it('rose_color_splits_into_subscopes', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      coordinate: { type: 'polar2D', angle: 'cat', radius: 'val' },
      scales: [
        { type: 'band', name: 'cat' },
        { type: 'linear', name: 'val' },
        { type: 'ordinal', name: 'col', range: ['#a', '#b', '#c'] },
      ],
      marks: [{ type: 'interval', encoding: { x: { field: 'month' }, y: { field: 'amount' }, color: { field: 'month', scale: 'col' } } }],
    });
    const layer = firstLayer(spec, { sales: SALES });
    // 3 类别 → 3 子 Scope（按颜色），各持一个 sector
    expect(layer.children).toHaveLength(3);
    expect((layer.children[0] as IRScope).type).toBe('scope');
    expect(sectorNodes(layer)).toHaveLength(3);
  });

  it('rose_compiles_to_scene', async () => {
    const { compileToScene } = await import('@retikz/core');
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [roseSpec()] },
      { composites: lowerPlots({ sales: SALES }, opts) },
    );
    expect(scene.primitives.length).toBeGreaterThan(0);
  });
});

// ── sector mark（饼图 / 环图）──────────────────────────────────────────
describe('lowerPlots sector mark pie / donut (ADR-02)', () => {
  const SHARE = [
    { label: 'A', value: 3 },
    { label: 'B', value: 5 },
    { label: 'C', value: 2 },
  ];
  // 饼图：stack transform 产 y0/y1（单链）→ sector mark 读界、角度编码值
  const pieSpec = (innerRadius = 0): PlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'share' },
      transform: [{ kind: 'stack', y: 'value' }],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r', innerRadius },
      scales: [
        { type: 'linear', name: 'a' },
        { type: 'linear', name: 'r' },
      ],
      marks: [{ type: 'sector', encoding: { color: { field: 'label' } } }],
    });

  it('pie_each_row_one_sector_node', () => {
    const nodes = sectorNodes(firstLayer(pieSpec(), { share: SHARE }));
    expect(nodes).toHaveLength(3);
    for (const node of nodes) expect(node.position).toEqual([200, 200]);
  });

  it('pie_angles_track_cumulative_bounds', () => {
    // 累积 A[0,3] B[3,8] C[8,10]、total 10、角向 linear [0,10]→[0,360]
    const params = sectorNodes(firstLayer(pieSpec(), { share: SHARE })).map(sectorParams);
    expect(params[0].startAngle).toBeCloseTo(0, 6);
    expect(params[0].endAngle).toBeCloseTo(108, 6); // 3/10*360
    expect(params[1].startAngle).toBeCloseTo(108, 6);
    expect(params[1].endAngle).toBeCloseTo(288, 6); // 8/10*360
    expect(params[2].endAngle).toBeCloseTo(360, 6); // 10/10*360
  });

  it('pie_fills_full_circle', () => {
    const params = sectorNodes(firstLayer(pieSpec(), { share: SHARE })).map(sectorParams);
    // 各扇片角度相接、整圆铺满 [0,360]
    expect(params[0].startAngle).toBeCloseTo(0, 6);
    expect(params[params.length - 1].endAngle).toBeCloseTo(360, 6);
    for (let i = 1; i < params.length; i += 1) {
      expect(params[i].startAngle).toBeCloseTo(params[i - 1].endAngle, 6);
    }
  });

  it('pie_radius_is_constant_full_ring', () => {
    // 半径常量满铺 [frame.innerRadius, frame.outerRadius] = [0, 200]，各片相同
    const params = sectorNodes(firstLayer(pieSpec(), { share: SHARE })).map(sectorParams);
    for (const p of params) {
      expect(p.innerRadius).toBeCloseTo(0, 6);
      expect(p.outerRadius).toBeCloseTo(200, 6);
    }
  });

  it('donut_inner_radius_from_coordinate', () => {
    // 环图：coordinate.innerRadius=0.5 → frame.innerRadius = 0.5 * 200 = 100
    const params = sectorNodes(firstLayer(pieSpec(0.5), { share: SHARE })).map(sectorParams);
    for (const p of params) {
      expect(p.innerRadius).toBeCloseTo(100, 6);
      expect(p.outerRadius).toBeCloseTo(200, 6);
      expect(p.outerRadius).toBeGreaterThan(p.innerRadius);
    }
  });

  it('pie_single_slice_full_circle', () => {
    const params = sectorNodes(firstLayer(pieSpec(), { share: [{ label: 'A', value: 7 }] })).map(sectorParams);
    expect(params).toHaveLength(1);
    expect(params[0].startAngle).toBeCloseTo(0, 6);
    expect(params[0].endAngle).toBeCloseTo(360, 6);
  });

  it('pie_color_splits_into_subscopes', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'share' },
      transform: [{ kind: 'stack', y: 'value' }],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      scales: [
        { type: 'linear', name: 'a' },
        { type: 'linear', name: 'r' },
        { type: 'ordinal', name: 'col', range: ['#a', '#b', '#c'] },
      ],
      marks: [{ type: 'sector', encoding: { color: { field: 'label', scale: 'col' } } }],
    });
    const layer = firstLayer(spec, { share: SHARE });
    // 每片颜色由 color 编码 → 3 子 Scope
    expect(layer.children).toHaveLength(3);
    expect((layer.children[0] as IRScope).nodeDefault?.fill).toBe('#a');
    expect(sectorNodes(layer)).toHaveLength(3);
  });

  it('pie_compiles_to_scene', async () => {
    const { compileToScene } = await import('@retikz/core');
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [pieSpec()] },
      { composites: lowerPlots({ share: SHARE }, opts) },
    );
    expect(scene.primitives.length).toBeGreaterThan(0);
  });

  // 错误路径：sector mark 读不到累积界字段（未跑 transform）→ 抛清晰错误
  it('pie_missing_cumulative_fields_throws', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'share' },
      // 故意不挂 stack transform → 行里没有 y0 / y1
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      scales: [
        { type: 'linear', name: 'a' },
        { type: 'linear', name: 'r' },
      ],
      marks: [{ type: 'sector', encoding: { color: { field: 'label' } } }],
    });
    expect(() => expandOf(spec, { share: SHARE })).toThrow();
  });

  // 错误路径：负值饼图 → 累积界倒退、扇片比例失真，必须 fail loud（Bug Hunter W-1）
  it('pie_negative_value_throws', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'share' },
      transform: [{ kind: 'stack', y: 'value' }],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      scales: [
        { type: 'linear', name: 'a' },
        { type: 'linear', name: 'r' },
      ],
      marks: [{ type: 'sector', encoding: { color: { field: 'label' } } }],
    });
    expect(() => expandOf(spec, { share: [{ label: 'A', value: 3 }, { label: 'B', value: -5 }, { label: 'C', value: 2 }] })).toThrow(/non-negative/);
  });
});
