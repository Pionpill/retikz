import { compileToScene } from '@retikz/core';
import type { IRPath, IRScope, IRStep } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';

/** 笛卡尔默认画布；polar 用正方形 → outerRadius = min(w,h)/2 = 200、center = [200,200] */
const cartOpts: LowerPlotsOptions = { width: 480, height: 300 };
const polarOpts: LowerPlotsOptions = { width: 400, height: 400 };

const expandOf = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, options: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

/** 取第一个 mark 图层 scope（外层 plot scope 的第一个子 scope） */
const firstLayer = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, options: LowerPlotsOptions): IRScope =>
  expandOf(spec, datasets, options).children[0] as IRScope;

/** 深度收集图层内所有 Path（无 color 时直接子或藏在子 Scope 里） */
const collectPaths = (layer: IRScope): Array<IRPath> => {
  const out: Array<IRPath> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'path') out.push(node as unknown as IRPath);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

/** step 是否有 to 坐标点 */
const stepPoint = (step: IRStep): [number, number] => (step as { to: [number, number] }).to;

/** 是否闭合（含 cycle step，或末点回到首点） */
const isClosedSteps = (steps: ReadonlyArray<IRStep>): boolean => {
  if (steps.some(s => s.kind === 'cycle')) return true;
  const withTo = steps.filter(s => s.kind === 'move' || s.kind === 'line');
  if (withTo.length < 2) return false;
  const first = stepPoint(withTo[0]);
  const last = stepPoint(withTo[withTo.length - 1]);
  return Math.abs(first[0] - last[0]) < 1e-6 && Math.abs(first[1] - last[1]) < 1e-6;
};

// ── cartesian area：上沿 + baseline 回边闭合的填充 Path ───────────────────
describe('lowerPlots area cartesian (ADR-03)', () => {
  const SALES = [
    { month: 0, revenue: 10 },
    { month: 1, revenue: 14 },
    { month: 2, revenue: 9 },
  ];
  const areaSpec = (extra: Record<string, unknown> = {}): PlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'area', encoding: { x: { field: 'month' }, y: { field: 'revenue' } }, ...extra }],
    });

  it('area_produces_single_fillable_path', () => {
    const layer = firstLayer(areaSpec({ order: 'month' }), { sales: SALES }, cartOpts);
    const paths = collectPaths(layer);
    expect(paths).toHaveLength(1);
    // 面积需要填充：path 或图层提供 fill（而非纯描边）
    const path = paths[0];
    const fill = path.fill ?? (layer.pathDefault as { fill?: unknown } | undefined)?.fill;
    expect(fill).toBeTruthy();
  });

  it('area_starts_with_move_and_is_closed', () => {
    const path = collectPaths(firstLayer(areaSpec({ order: 'month' }), { sales: SALES }, cartOpts))[0];
    const steps = path.children;
    expect(steps[0].kind).toBe('move');
    expect(isClosedSteps(steps)).toBe(true);
  });

  it('area_top_outline_matches_value_projection', () => {
    // domain x [0,2]->[0,480]; y [9,14]->[300,0]。上沿首点 = 投影(month0,rev10)
    const path = collectPaths(firstLayer(areaSpec({ order: 'month' }), { sales: SALES }, cartOpts))[0];
    const first = stepPoint(path.children[0]);
    expect(first[0]).toBeCloseTo(0, 6);
    // revenue 10 在 [9,14] 内 → y 介于 300 与 0 之间（非 baseline）
    expect(first[1]).toBeGreaterThan(0);
    expect(first[1]).toBeLessThan(300);
  });

  it('area_baseline_zero_return_edge_at_baseline', () => {
    // baseline 0 投影 y = 300（屏幕底）。回边上至少有一点贴 baseline y≈300
    const path = collectPaths(firstLayer(areaSpec({ order: 'month', baseline: 0 }), { sales: SALES }, cartOpts))[0];
    const ys = path.children.filter(s => s.kind === 'move' || s.kind === 'line').map(s => stepPoint(s)[1]);
    expect(Math.max(...ys)).toBeCloseTo(300, 6);
  });

  it('area_compiles_to_scene', () => {
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [areaSpec({ order: 'month' })] },
      { composites: lowerPlots({ sales: SALES }, cartOpts) },
    );
    expect(scene.primitives.length).toBeGreaterThan(0);
  });

  // 边界：<2 点 → null（不成面）
  it('area_single_point_yields_no_layer', () => {
    const outer = expandOf(areaSpec(), { sales: [{ month: 1, revenue: 5 }] }, cartOpts);
    expect(outer.children).toHaveLength(0);
  });

  it('area_empty_data_yields_no_layer', () => {
    const outer = expandOf(areaSpec(), { sales: [] }, cartOpts);
    expect(outer.children).toHaveLength(0);
  });

  // 错误路径：非有限值跳过该点（守投影 null 语义）
  it('area_non_finite_point_skipped', () => {
    const rows = [
      { month: 0, revenue: 10 },
      { month: 'oops', revenue: 14 },
      { month: 2, revenue: 9 },
    ];
    // 仍有 2 个有效顶点 → 成面（不抛错）
    const path = collectPaths(firstLayer(areaSpec({ order: 'month' }), { sales: rows }, cartOpts))[0];
    expect(path.type).toBe('path');
  });

  // 交互：多系列 area → 拆多子 Path
  it('area_series_splits_into_multiple_paths', () => {
    const TREND = [
      { t: 0, v: 1, city: 'X' },
      { t: 1, v: 3, city: 'X' },
      { t: 0, v: 2, city: 'Y' },
      { t: 1, v: 4, city: 'Y' },
    ];
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 't' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'col', range: ['#aa', '#bb'] },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'area', series: 'city', order: 't', encoding: { x: { field: 't' }, y: { field: 'v' }, color: { field: 'city', scale: 'col' } } }],
    });
    const paths = collectPaths(firstLayer(spec, { t: TREND }, cartOpts));
    expect(paths).toHaveLength(2);
  });
});

// ── cartesian line 回归：不采样、产物等价既有 ─────────────────────────────
describe('lowerPlots line cartesian regression (ADR-03)', () => {
  const SALES = [
    { month: 0, revenue: 10 },
    { month: 1, revenue: 14 },
    { month: 2, revenue: 9 },
  ];
  const lineSpec = (extra: Record<string, unknown> = {}): PlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'line', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } }, ...extra }],
    });

  it('line_unchanged_no_sampling', () => {
    // cartesian 永不采样：3 顶点 → move + 2 line，逐字等价 alpha.3
    const path = collectPaths(firstLayer(lineSpec(), { sales: SALES }, cartOpts))[0];
    expect(path.children).toEqual([
      { type: 'step', kind: 'move', to: [0, 240] },
      { type: 'step', kind: 'line', to: [240, 0] },
      { type: 'step', kind: 'line', to: [480, 300] },
    ]);
  });

  it('open_line_not_closed', () => {
    // 默认 closed 省略 → 不闭合（无 cycle、末点 ≠ 首点）
    const path = collectPaths(firstLayer(lineSpec(), { sales: SALES }, cartOpts))[0];
    expect(path.children.some(s => s.kind === 'cycle')).toBe(false);
  });

  // closed line（cartesian 允许闭合多边形）
  it('closed_line_returns_to_first_point', () => {
    const path = collectPaths(firstLayer(lineSpec({ closed: true }), { sales: SALES }, cartOpts))[0];
    expect(isClosedSteps(path.children)).toBe(true);
  });
});

// ── polar line：连续角轴段内采样、分类角轴走弦 ───────────────────────────
describe('lowerPlots line polar sampling (ADR-03)', () => {
  // 两顶点大角差：linear 角轴 domain → [0,360]，半径线性
  const POLAR = [
    { a: 0, r: 5 },
    { a: 9, r: 10 },
  ];
  const polarLineSpec = (extra: Record<string, unknown> = {}): PlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      scales: [
        { type: 'linear', name: 'a' },
        { type: 'linear', name: 'r' },
      ],
      marks: [{ type: 'line', order: 'a', encoding: { x: { field: 'a' }, y: { field: 'r' } }, ...extra }],
    });

  it('polar_continuous_axis_densifies_segment', () => {
    // 连续角轴 + 非 closed：相邻顶点大角差 → 段内插值中间点（points 数 > 顶点数 2）
    const path = collectPaths(firstLayer(polarLineSpec(), { d: POLAR }, polarOpts))[0];
    const points = path.children.filter(s => s.kind === 'move' || s.kind === 'line');
    expect(points.length).toBeGreaterThan(2);
  });

  it('polar_sampled_points_lie_on_projected_arc', () => {
    // 采样点在 [θ,r] 空间线性插值后反投影：半径插值 → 到圆心距离介于两端半径之间且单调
    const path = collectPaths(firstLayer(polarLineSpec(), { d: POLAR }, polarOpts))[0];
    const center = [200, 200];
    const radii = path.children
      .filter(s => s.kind === 'move' || s.kind === 'line')
      .map(s => {
        const [x, y] = stepPoint(s);
        return Math.hypot(x - center[0], y - center[1]);
      });
    // 端点半径：r=5 (domain min→innerRadius 0)、r=10 (domain max→outerRadius 200)
    expect(radii[0]).toBeCloseTo(0, 6);
    expect(radii[radii.length - 1]).toBeCloseTo(200, 6);
    // 中间采样点半径单调递增（半径空间线性插值）
    for (let i = 1; i < radii.length; i += 1) {
      expect(radii[i]).toBeGreaterThanOrEqual(radii[i - 1] - 1e-6);
    }
  });

  it('polar_band_axis_walks_chords_no_sampling', () => {
    // 分类角轴（band）：类别间无中间值 → 不采样、走弦（points 数 == 顶点数）
    const CAT = [
      { dim: 'A', v: 5 },
      { dim: 'B', v: 8 },
      { dim: 'C', v: 6 },
    ];
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      scales: [
        { type: 'band', name: 'a' },
        { type: 'linear', name: 'r' },
      ],
      marks: [{ type: 'line', encoding: { x: { field: 'dim' }, y: { field: 'v' } } }],
    });
    const path = collectPaths(firstLayer(spec, { d: CAT }, polarOpts))[0];
    const points = path.children.filter(s => s.kind === 'move' || s.kind === 'line');
    expect(points).toHaveLength(3);
  });

  it('polar_closed_line_walks_chords_no_sampling', () => {
    // closed（雷达）恒走弦：即便连续角轴，closed 多边形不段内采样
    const path = collectPaths(firstLayer(polarLineSpec({ closed: true }), { d: POLAR }, polarOpts))[0];
    expect(isClosedSteps(path.children)).toBe(true);
    // 顶点 2 个 → 走弦（不因连续角轴而采样）；闭合多边形点数贴近顶点数
    const lines = path.children.filter(s => s.kind === 'move' || s.kind === 'line');
    expect(lines.length).toBeLessThanOrEqual(3);
  });
});

// ── 雷达：line + polar + point 角向 + closed → 闭合多边形 ─────────────────
describe('lowerPlots radar (ADR-03)', () => {
  const METRICS = [
    { dim: 'speed', value: 3 },
    { dim: 'power', value: 5 },
    { dim: 'range', value: 2 },
    { dim: 'cost', value: 4 },
  ];
  const radarSpec = (): PlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'm' },
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      scales: [
        { type: 'point', name: 'a' },
        { type: 'linear', name: 'r' },
      ],
      marks: [{ type: 'line', closed: true, encoding: { x: { field: 'dim' }, y: { field: 'value' } } }],
    });

  it('radar_is_closed_polygon', () => {
    const path = collectPaths(firstLayer(radarSpec(), { m: METRICS }, polarOpts))[0];
    expect(isClosedSteps(path.children)).toBe(true);
  });

  it('radar_vertices_lie_on_distinct_angular_axes', () => {
    // 4 维 point scale 等分角度 → 4 顶点各落不同方位（角度互异）
    const path = collectPaths(firstLayer(radarSpec(), { m: METRICS }, polarOpts))[0];
    const center = [200, 200];
    const angles = path.children
      .filter(s => s.kind === 'move' || s.kind === 'line')
      .map(s => {
        const [x, y] = stepPoint(s);
        return Math.round(Math.atan2(y - center[1], x - center[0]) * 1e4);
      });
    const distinct = new Set(angles);
    expect(distinct.size).toBeGreaterThanOrEqual(4);
  });

  it('radar_compiles_to_scene', () => {
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [radarSpec()] },
      { composites: lowerPlots({ m: METRICS }, polarOpts) },
    );
    expect(scene.primitives.length).toBeGreaterThan(0);
  });
});

// ── polar area：上沿 + baseline 回边（polar baseline = 径向内界方向）─────
describe('lowerPlots area polar (ADR-03)', () => {
  const METRICS = [
    { dim: 'a', value: 4 },
    { dim: 'b', value: 8 },
    { dim: 'c', value: 6 },
  ];
  const polarAreaSpec = (extra: Record<string, unknown> = {}): PlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'm' },
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      scales: [
        { type: 'point', name: 'a' },
        { type: 'linear', name: 'r' },
      ],
      marks: [{ type: 'area', closed: true, encoding: { x: { field: 'dim' }, y: { field: 'value' } }, ...extra }],
    });

  it('polar_area_is_fillable_closed_path', () => {
    const layer = firstLayer(polarAreaSpec(), { m: METRICS }, polarOpts);
    const path = collectPaths(layer)[0];
    expect(path.children[0].kind).toBe('move');
    expect(isClosedSteps(path.children)).toBe(true);
    const fill = path.fill ?? (layer.pathDefault as { fill?: unknown } | undefined)?.fill;
    expect(fill).toBeTruthy();
  });

  it('polar_area_return_edge_at_inner_baseline', () => {
    // baseline 0 → 径向内界（radiusScale(0) = innerRadius 0 = 圆心方向）。回边点贴近圆心
    const path = collectPaths(firstLayer(polarAreaSpec({ baseline: 0 }), { m: METRICS }, polarOpts))[0];
    const center = [200, 200];
    const radii = path.children
      .filter(s => s.kind === 'move' || s.kind === 'line')
      .map(s => {
        const [x, y] = stepPoint(s);
        return Math.hypot(x - center[0], y - center[1]);
      });
    // baseline 回边至少一点贴圆心（半径 ≈ 0）
    expect(Math.min(...radii)).toBeCloseTo(0, 6);
  });

  it('polar_area_compiles_to_scene', () => {
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [polarAreaSpec()] },
      { composites: lowerPlots({ m: METRICS }, polarOpts) },
    );
    expect(scene.primitives.length).toBeGreaterThan(0);
  });
});
