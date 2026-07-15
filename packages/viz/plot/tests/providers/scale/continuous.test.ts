import type { IRPath, IRScope, IRStep } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import type { IRPlotSpec } from '../../../src/schemas';

import { lowerPlots } from '../../../src/pipeline/expand';
import { PlotSpecSchema } from '../../../src/schemas';

/** 笛卡尔使用默认画布；极坐标使用正方形画布，因此 outerRadius = 200、center = [200, 200] */
const cartOpts: LowerPlotsOptions = { width: 480, height: 300 };
const polarOpts: LowerPlotsOptions = { width: 400, height: 400 };

const expandOf = (
  spec: IRPlotSpec,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: LowerPlotsOptions,
): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

/** 取得第一个 mark 图层 Scope，也就是外层 plot Scope 的第一个子 Scope */
const firstLayer = (
  spec: IRPlotSpec,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: LowerPlotsOptions,
): IRScope => expandOf(spec, datasets, options).children[0] as IRScope;

/** 深度收集图层内所有 Path；颜色分组时 Path 可能位于子 Scope */
const collectPaths = (layer: IRScope): Array<IRPath> => {
  const out: Array<IRPath> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'path') out.push(child as IRPath);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

/** 读取 step 的目标坐标 */
const stepPoint = (step: IRStep): [number, number] => (step as { to: [number, number] }).to;

/** 判断路径是否包含 cycle step，或末点是否回到首点 */
const isClosedSteps = (steps: ReadonlyArray<IRStep>): boolean => {
  if (steps.some(s => s.kind === 'cycle')) return true;
  const withTo = steps.filter(s => s.kind === 'move' || s.kind === 'line');
  if (withTo.length < 2) return false;
  const first = stepPoint(withTo[0]);
  const last = stepPoint(withTo[withTo.length - 1]);
  return Math.abs(first[0] - last[0]) < 1e-6 && Math.abs(first[1] - last[1]) < 1e-6;
};

// ── 笛卡尔面积：上沿与 baseline 回边组成闭合填充路径 ──
describe('lowerPlots 笛卡尔面积路径', () => {
  const SALES = [
    { month: 0, revenue: 10 },
    { month: 1, revenue: 14 },
    { month: 2, revenue: 9 },
  ];
  const areaSpec = (extra: Record<string, unknown> = {}): IRPlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'path',
          closure: { kind: 'baseline' },
          encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
          ...extra,
        },
      ],
    });

  it('area_closure_without_fill_is_unfilled', () => {
    const layer = firstLayer(areaSpec({ order: 'month' }), { sales: SALES }, cartOpts);
    const paths = collectPaths(layer);
    expect(paths).toHaveLength(1);
    const path = paths[0];
    const fill = path.fill ?? (layer.pathDefault as { fill?: unknown } | undefined)?.fill;
    expect(fill).toBeUndefined();
  });

  it('area_fill_can_be_enabled_explicitly', () => {
    const layer = firstLayer(
      areaSpec({ order: 'month', fill: { kind: 'constant', value: 'rgba(14, 165, 233, 0.22)' } }),
      { sales: SALES },
      cartOpts,
    );
    const path = collectPaths(layer)[0];
    const fill = path.fill ?? (layer.pathDefault as { fill?: unknown } | undefined)?.fill;
    expect(fill).toBe('rgba(14, 165, 233, 0.22)');
    expect(isClosedSteps(path.children)).toBe(true);
  });

  it('area_starts_with_move_and_is_closed', () => {
    const path = collectPaths(firstLayer(areaSpec({ order: 'month' }), { sales: SALES }, cartOpts))[0];
    const steps = path.children;
    expect(steps[0].kind).toBe('move');
    expect(isClosedSteps(steps)).toBe(true);
  });

  it('area_top_outline_matches_value_projection', () => {
    // domain x [0,2] -> [0,480]；y [9,14] -> [300,0]；上沿首点是 (month0, revenue10) 的投影
    const path = collectPaths(firstLayer(areaSpec({ order: 'month' }), { sales: SALES }, cartOpts))[0];
    const first = stepPoint(path.children[0]);
    expect(first[0]).toBeCloseTo(0, 6);
    // revenue 10 位于 [9,14] 内，因此 y 介于 0 与 300 之间，而不是 baseline
    expect(first[1]).toBeGreaterThan(0);
    expect(first[1]).toBeLessThan(300);
  });

  it('area_baseline_zero_return_edge_at_baseline', () => {
    // baseline 0 投影到屏幕底部 y = 300，回边至少有一点贴近该位置
    const path = collectPaths(
      firstLayer(areaSpec({ order: 'month', closure: { kind: 'baseline', baseline: 0 } }), { sales: SALES }, cartOpts),
    )[0];
    const ys = path.children.filter(s => s.kind === 'move' || s.kind === 'line').map(s => stepPoint(s)[1]);
    expect(Math.max(...ys)).toBeCloseTo(300, 6);
  });

  it('area_default_baseline_uses_value_domain_edge_when_zero_is_outside', () => {
    const rows = [
      { month: 0, revenue: 40 },
      { month: 1, revenue: 60 },
      { month: 2, revenue: 50 },
    ];
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domain: [30, 70], domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'path',
          order: 'month',
          closure: { kind: 'baseline' },
          encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
        },
      ],
    });
    const path = collectPaths(firstLayer(spec, { sales: rows }, cartOpts))[0];
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

  // 少于两个有效点时返回 null，不生成面积
  it('area_single_point_yields_no_layer', () => {
    const outer = expandOf(areaSpec(), { sales: [{ month: 1, revenue: 5 }] }, cartOpts);
    expect(outer.children).toHaveLength(0);
  });

  it('area_empty_data_yields_no_layer', () => {
    const outer = expandOf(areaSpec(), { sales: [] }, cartOpts);
    expect(outer.children).toHaveLength(0);
  });

  // 非有限值对应的投影为 null，该点会被跳过
  it('area_non_finite_point_skipped', () => {
    const rows = [
      { month: 0, revenue: 10 },
      { month: 'oops', revenue: 14 },
      { month: 2, revenue: 9 },
    ];
    // 仍有两个有效顶点，可以生成面积且不抛错
    const path = collectPaths(firstLayer(areaSpec({ order: 'month' }), { sales: rows }, cartOpts))[0];
    expect(path.type).toBe('path');
  });

  // 多系列面积会拆成多个子 Path
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
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
        { type: 'ordinal', name: 'col', range: ['#aa', '#bb'] },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'path',
          series: 'city',
          order: 't',
          closure: { kind: 'baseline' },
          encoding: { x: { field: 't' }, y: { field: 'v' }, color: { field: 'city', scale: 'col' } },
        },
      ],
    });
    const paths = collectPaths(firstLayer(spec, { t: TREND }, cartOpts));
    expect(paths).toHaveLength(2);
  });
});
// ── 笛卡尔折线回归：不采样并保持既有产物 ──
describe('lowerPlots 笛卡尔折线回归', () => {
  const SALES = [
    { month: 0, revenue: 10 },
    { month: 1, revenue: 14 },
    { month: 2, revenue: 9 },
  ];
  const lineSpec = (extra: Record<string, unknown> = {}): IRPlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'path', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } }, ...extra }],
    });

  it('line_unchanged_no_sampling', () => {
    // 笛卡尔折线不采样：三个顶点生成一个 move 和两个 line step
    const path = collectPaths(firstLayer(lineSpec(), { sales: SALES }, cartOpts))[0];
    expect(path.children).toEqual([
      { type: 'step', kind: 'move', to: [0, 240] },
      { type: 'step', kind: 'line', to: [240, 0] },
      { type: 'step', kind: 'line', to: [480, 300] },
    ]);
  });

  it('open_line_not_closed', () => {
    // 省略 closed 时不闭合：没有 cycle，末点也不等于首点
    const path = collectPaths(firstLayer(lineSpec(), { sales: SALES }, cartOpts))[0];
    expect(path.children.some(s => s.kind === 'cycle')).toBe(false);
  });

  // 笛卡尔 closed line 允许形成闭合多边形
  it('closed_line_returns_to_first_point', () => {
    const path = collectPaths(firstLayer(lineSpec({ closed: true }), { sales: SALES }, cartOpts))[0];
    expect(isClosedSteps(path.children)).toBe(true);
  });

  it('line_missing_points_split_into_multiple_core_paths_by_default', () => {
    const rows = [
      { month: 0, revenue: 10 },
      { month: 1, revenue: 12 },
      { month: 2, revenue: null },
      { month: 3, revenue: 9 },
      { month: 4, revenue: 11 },
    ];
    const paths = collectPaths(firstLayer(lineSpec(), { sales: rows }, cartOpts));
    expect(paths).toHaveLength(2);
    expect(paths.map(path => path.children.filter(step => step.kind === 'move').length)).toEqual([1, 1]);
    expect(paths.map(path => path.children.filter(step => step.kind === 'line').length)).toEqual([1, 1]);
  });

  it('line_connect_nulls_keeps_previous_skip_and_connect_behavior', () => {
    const rows = [
      { month: 0, revenue: 10 },
      { month: 1, revenue: 12 },
      { month: 2, revenue: null },
      { month: 3, revenue: 9 },
      { month: 4, revenue: 11 },
    ];
    const paths = collectPaths(firstLayer(lineSpec({ connectNulls: true }), { sales: rows }, cartOpts));
    expect(paths).toHaveLength(1);
    expect(paths[0].children.filter(step => step.kind === 'move')).toHaveLength(1);
    expect(paths[0].children.filter(step => step.kind === 'line')).toHaveLength(3);
  });
});

describe('lowerPlots path closure cartesian', () => {
  const SERIES = [
    { x: 0, y: 10, y0: 0, y1: 3 },
    { x: 1, y: 14, y0: 1, y1: 4 },
    { x: 2, y: 12, y0: 2, y1: 6 },
  ];
  const pathSpec = (extra: Record<string, unknown> = {}): IRPlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'series' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'path', order: 'x', encoding: { x: { field: 'x' }, y: { field: 'y' } }, ...extra }],
    });

  it('path_closure_baseline_produces_fillable_closed_path', () => {
    const layer = firstLayer(
      pathSpec({
        closure: { kind: 'baseline', baseline: 8 },
        fill: { kind: 'constant', value: 'rgba(14, 165, 233, 0.22)' },
      }),
      { series: SERIES },
      cartOpts,
    );
    const [path] = collectPaths(layer);
    const fill = path.fill ?? (layer.pathDefault as { fill?: unknown } | undefined)?.fill;
    expect(fill).toBeTruthy();
    expect(isClosedSteps(path.children)).toBe(true);
    const ys = path.children.filter(s => s.kind === 'move' || s.kind === 'line').map(s => stepPoint(s)[1]);
    expect(Math.max(...ys)).toBeCloseTo(300, 6);
  });

  it('path_closure_baseline_can_disable_stroke', () => {
    const layer = firstLayer(
      pathSpec({ closure: { kind: 'baseline', baseline: 8 }, stroke: { kind: 'constant', value: 'none' } }),
      { series: SERIES },
      cartOpts,
    );
    const path = collectPaths(layer)[0];
    expect(path.stroke ?? layer.pathDefault?.stroke).toBe('none');
    expect(isClosedSteps(path.children)).toBe(true);
  });

  it('path_closure_baseline_keeps_curve_steps_on_upper_outline', () => {
    const path = collectPaths(
      firstLayer(
        pathSpec({ curve: 'monotoneX', closure: { kind: 'baseline', baseline: 8 } }),
        { series: SERIES },
        cartOpts,
      ),
    )[0];
    expect(path.children.some(step => step.kind === 'cubic')).toBe(true);
    expect(path.children[path.children.length - 1].kind).toBe('cycle');
  });

  it('path_closure_baseline_splits_fill_at_missing_points', () => {
    const rows = [
      { x: 0, y: 10 },
      { x: 1, y: 12 },
      { x: 2, y: null },
      { x: 3, y: 9 },
      { x: 4, y: 11 },
    ];
    const layer = firstLayer(
      pathSpec({
        closure: { kind: 'baseline', baseline: 8 },
        fill: { kind: 'constant', value: 'rgba(14, 165, 233, 0.22)' },
        stroke: { kind: 'constant', value: 'none' },
      }),
      { series: rows },
      cartOpts,
    );
    const paths = collectPaths(layer);
    expect(paths).toHaveLength(2);
    for (const path of paths) expect(isClosedSteps(path.children)).toBe(true);
    expect(
      paths.every(
        path =>
          (path.fill ?? (layer.pathDefault as { fill?: unknown } | undefined)?.fill) === 'rgba(14, 165, 233, 0.22)',
      ),
    ).toBe(true);
  });

  it('path_closure_stack_uses_per_row_baseline_field', () => {
    const spec = pathSpec({
      closure: { kind: 'stack', baselineField: 'y0' },
      encoding: { x: { field: 'x' }, y: { field: 'y1' } },
    });
    const path = collectPaths(firstLayer(spec, { series: SERIES }, cartOpts))[0];
    expect(isClosedSteps(path.children)).toBe(true);
    const linePoints = path.children.filter(s => s.kind === 'move' || s.kind === 'line').map(stepPoint);
    const stackReturnEnd = linePoints.find(([x, y]) => Math.abs(x - 480) < 1e-6 && y > 100);
    expect(stackReturnEnd?.[1]).toBeCloseTo(200, 6);
    const stackReturnStart = linePoints.find(([x, y]) => Math.abs(x) < 1e-6 && y > 250);
    expect(stackReturnStart?.[1]).toBeCloseTo(300, 6);
  });

  it('path_closure_stack_applies_curve_to_return_edge', () => {
    const spec = pathSpec({
      curve: 'cardinal',
      closure: { kind: 'stack', baselineField: 'y0' },
      encoding: { x: { field: 'x' }, y: { field: 'y1' } },
    });
    const path = collectPaths(firstLayer(spec, { series: SERIES }, cartOpts))[0];
    expect(path.children.filter(step => step.kind === 'cubic')).toHaveLength(4);
  });
});

// ── 极坐标折线：连续角轴段内采样，分类角轴走弦 ──
describe('lowerPlots 极坐标折线采样', () => {
  // 两个顶点角差较大：linear 角轴映射到 [0,360]，半径保持线性
  const POLAR = [
    { a: 0, r: 5 },
    { a: 9, r: 10 },
  ];
  const polarLineSpec = (extra: Record<string, unknown> = {}): IRPlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      scales: [
        { type: 'linear', name: 'a', domainPadding: 0 },
        { type: 'linear', name: 'r', domainPadding: 0 },
      ],
      marks: [{ type: 'path', order: 'a', encoding: { x: { field: 'a' }, y: { field: 'r' } }, ...extra }],
    });

  it('polar_path_defaults_to_closed', () => {
    const path = collectPaths(firstLayer(polarLineSpec(), { d: POLAR }, polarOpts))[0];
    expect(isClosedSteps(path.children)).toBe(true);
  });

  it('polar_monotone_curve_falls_back_to_linear_steps', () => {
    const path = collectPaths(firstLayer(polarLineSpec({ curve: 'monotoneY' }), { d: POLAR }, polarOpts))[0];
    expect(path.children.some(step => step.kind === 'cubic' || step.kind === 'smooth')).toBe(false);
    expect(path.children.some(step => step.kind === 'line')).toBe(true);
  });

  it('polar_continuous_axis_densifies_segment', () => {
    // 连续角轴且未闭合时，相邻顶点角差较大会在段内插入采样点
    const path = collectPaths(firstLayer(polarLineSpec({ closed: false }), { d: POLAR }, polarOpts))[0];
    const points = path.children.filter(s => s.kind === 'move' || s.kind === 'line');
    expect(points.length).toBeGreaterThan(2);
  });

  it('polar_sampled_points_lie_on_projected_arc', () => {
    // 采样点在 [θ,r] 空间线性插值后反投影，圆心距离位于两端半径之间且单调
    const path = collectPaths(firstLayer(polarLineSpec({ closed: false }), { d: POLAR }, polarOpts))[0];
    const center = [200, 200];
    const radii = path.children
      .filter(s => s.kind === 'move' || s.kind === 'line')
      .map(s => {
        const [x, y] = stepPoint(s);
        return Math.hypot(x - center[0], y - center[1]);
      });
    // 端点半径：r=5 映射到 innerRadius 0，r=10 映射到 outerRadius 200
    expect(radii[0]).toBeCloseTo(0, 6);
    expect(radii[radii.length - 1]).toBeCloseTo(200, 6);
    // 中间采样点半径按半径空间线性插值并单调递增
    for (let i = 1; i < radii.length; i += 1) {
      expect(radii[i]).toBeGreaterThanOrEqual(radii[i - 1] - 1e-6);
    }
  });

  it('polar_band_axis_walks_chords_no_sampling', () => {
    // 分类角轴（band）在类别之间没有中间值，因此不采样并直接走弦
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
        { type: 'linear', name: 'r', domainPadding: 0 },
      ],
      marks: [{ type: 'path', encoding: { x: { field: 'dim' }, y: { field: 'v' } } }],
    });
    const path = collectPaths(firstLayer(spec, { d: CAT }, polarOpts))[0];
    const points = path.children.filter(s => s.kind === 'move' || s.kind === 'line');
    expect(points).toHaveLength(3);
  });

  it('polar_closed_line_walks_chords_no_sampling', () => {
    // closed 雷达图恒走弦：即使使用连续角轴，闭合多边形也不做段内采样
    const path = collectPaths(firstLayer(polarLineSpec({ closed: true }), { d: POLAR }, polarOpts))[0];
    expect(isClosedSteps(path.children)).toBe(true);
    // 两个顶点直接走弦，不因连续角轴增加采样点
    const lines = path.children.filter(s => s.kind === 'move' || s.kind === 'line');
    expect(lines.length).toBeLessThanOrEqual(3);
  });
});

// ── 雷达图：polar + point 角向 + closed 形成闭合多边形 ──
describe('lowerPlots 雷达图', () => {
  const METRICS = [
    { dim: 'speed', value: 3 },
    { dim: 'power', value: 5 },
    { dim: 'range', value: 2 },
    { dim: 'cost', value: 4 },
  ];
  const radarSpec = (): IRPlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'm' },
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      scales: [
        { type: 'point', name: 'a' },
        { type: 'linear', name: 'r', domainPadding: 0 },
      ],
      marks: [{ type: 'path', closed: true, encoding: { x: { field: 'dim' }, y: { field: 'value' } } }],
    });

  it('radar_is_closed_polygon', () => {
    const path = collectPaths(firstLayer(radarSpec(), { m: METRICS }, polarOpts))[0];
    expect(isClosedSteps(path.children)).toBe(true);
  });

  it('radar_vertices_lie_on_distinct_angular_axes', () => {
    // point scale 将四组类别等分到不同角度，四个顶点落在不同方位
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

// ── 极坐标面积：上沿与径向 baseline 回边组成闭合路径 ──
describe('lowerPlots 极坐标面积路径', () => {
  const METRICS = [
    { dim: 'a', value: 4 },
    { dim: 'b', value: 8 },
    { dim: 'c', value: 6 },
  ];
  const STACK = [
    { dim: 'a', y0: 0, y1: 4 },
    { dim: 'b', y0: 0, y1: 8 },
    { dim: 'c', y0: 0, y1: 6 },
  ];
  const polarAreaSpec = (extra: Record<string, unknown> = {}): IRPlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'm' },
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      scales: [
        { type: 'point', name: 'a' },
        { type: 'linear', name: 'r', domainPadding: 0 },
      ],
      marks: [
        {
          type: 'path',
          closure: { kind: 'baseline', baseline: 0 },
          encoding: { x: { field: 'dim' }, y: { field: 'value' } },
          ...extra,
        },
      ],
    });
  const polarStackSpec = (extra: Record<string, unknown> = {}): IRPlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'm' },
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      scales: [
        { type: 'point', name: 'a' },
        { type: 'linear', name: 'r', domainPadding: 0 },
      ],
      marks: [
        {
          type: 'path',
          closure: { kind: 'stack', baselineField: 'y0' },
          encoding: { x: { field: 'dim' }, y: { field: 'y1' } },
          ...extra,
        },
      ],
    });

  it('polar_area_is_fillable_closed_path', () => {
    const layer = firstLayer(
      polarAreaSpec({ fill: { kind: 'constant', value: 'rgba(16, 185, 129, 0.22)' } }),
      { m: METRICS },
      polarOpts,
    );
    const path = collectPaths(layer)[0];
    expect(path.children[0].kind).toBe('move');
    expect(isClosedSteps(path.children)).toBe(true);
    const fill = path.fill ?? (layer.pathDefault as { fill?: unknown } | undefined)?.fill;
    expect(fill).toBe('rgba(16, 185, 129, 0.22)');
  });

  it('polar_area_return_edge_at_inner_baseline', () => {
    // baseline 0 映射到径向内界；innerRadius 为 0 时，回边点贴近圆心
    const path = collectPaths(
      firstLayer(polarAreaSpec({ closure: { kind: 'baseline', baseline: 0 } }), { m: METRICS }, polarOpts),
    )[0];
    const center = [200, 200];
    const radii = path.children
      .filter(s => s.kind === 'move' || s.kind === 'line')
      .map(s => {
        const [x, y] = stepPoint(s);
        return Math.hypot(x - center[0], y - center[1]);
      });
    // baseline 回边至少有一点贴近圆心
    expect(Math.min(...radii)).toBeCloseTo(0, 6);
  });

  it('polar_area_default_baseline_uses_radius_domain_edge_when_zero_is_outside', () => {
    const rows = [
      { dim: 'a', value: 40 },
      { dim: 'b', value: 60 },
      { dim: 'c', value: 50 },
    ];
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'm' },
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      scales: [
        { type: 'point', name: 'a' },
        { type: 'linear', name: 'r', domain: [30, 70], domainPadding: 0 },
      ],
      marks: [
        { type: 'path', closure: { kind: 'baseline' }, encoding: { x: { field: 'dim' }, y: { field: 'value' } } },
      ],
    });
    const path = collectPaths(firstLayer(spec, { m: rows }, polarOpts))[0];
    const center = [200, 200];
    const radii = path.children
      .filter(s => s.kind === 'move' || s.kind === 'line')
      .map(s => {
        const [x, y] = stepPoint(s);
        return Math.hypot(x - center[0], y - center[1]);
      });
    expect(Math.min(...radii)).toBeCloseTo(0, 6);
  });

  it('polar_stack_area_defaults_to_closed_loop', () => {
    const path = collectPaths(firstLayer(polarStackSpec(), { m: STACK }, polarOpts))[0];
    expect(isClosedSteps(path.children)).toBe(true);
    const lineSteps = path.children.filter(s => s.kind === 'move' || s.kind === 'line');
    expect(lineSteps.length).toBeGreaterThan(STACK.length * 2);
  });

  it('polar_stack_area_monotone_curve_falls_back_to_linear_steps', () => {
    const path = collectPaths(firstLayer(polarStackSpec({ curve: 'monotoneY' }), { m: STACK }, polarOpts))[0];
    expect(path.children.some(step => step.kind === 'cubic' || step.kind === 'smooth')).toBe(false);
    expect(path.children.some(step => step.kind === 'line')).toBe(true);
  });

  it('polar_stack_area_respects_closed_false', () => {
    const path = collectPaths(firstLayer(polarStackSpec({ closed: false }), { m: STACK }, polarOpts))[0];
    expect(isClosedSteps(path.children)).toBe(true);
    const lineSteps = path.children.filter(s => s.kind === 'move' || s.kind === 'line');
    expect(lineSteps.length).toBe(STACK.length * 2);
  });

  it('polar_area_compiles_to_scene', () => {
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [polarAreaSpec()] },
      { composites: lowerPlots({ m: METRICS }, polarOpts) },
    );
    expect(scene.primitives.length).toBeGreaterThan(0);
  });
});
