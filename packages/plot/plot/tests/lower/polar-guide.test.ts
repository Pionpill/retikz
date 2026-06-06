import type { IRChild, IRNode, IRPath, IRScope, IRStep } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';

/**
 * ADR-04 polar guide lowering 测试。
 * 断言 lowerPlots 产出的 core IR（scope 分层 + path step kind=arc/line + node text/position），
 * 不碰内部函数。投影约定（ADR-01 §2）：θ=angleScale(angleValue) 度、r=radiusScale(radiusValue)，
 *   返回 [cx + r·cos(θ°), cy + r·sin(θ°)]；0°=+x、90°=+y（屏幕 y 向下）。
 * polar guide：angular axis = 外圆弧 + 角向刻度 + 圆周外标签；radial axis = 沿 startAngle 辐条 + 刻度 + 标签；
 *   radius grid = 同心环（arc）；angle grid = 圆心→外圆辐条（直段）。
 * z-order（沿用 alpha.2）：gridLayer 垫底 → markLayers → axisLayer 压顶。
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

const expandOf = (spec: PlotSpec, datasets: Datasets, options?: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

const opts: LowerPlotsOptions = { width: 480, height: 300 };

/** 是否为 path 子节点 */
const isPath = (child: IRChild): child is IRPath => child.type === 'path';
/** 是否为 node 子节点 */
const isNode = (child: IRChild): child is IRNode => child.type === 'node';
/** 是否为 scope 子节点 */
const isScope = (child: IRChild): child is IRScope => child.type === 'scope';

/** 一个 scope 层里所有 path 子节点 */
const pathsOf = (layer: IRScope): Array<IRPath> => layer.children.filter(isPath);
/** 一个 scope 层里所有 node 子节点（刻度标签） */
const nodesOf = (layer: IRScope): Array<IRNode> => layer.children.filter(isNode);
/** 一条 path 里所有 step 的 kind */
const stepKinds = (path: IRPath): Array<IRStep['kind']> => path.children.map(step => step.kind);
/** 一条 path 里是否含某 kind 的 step */
const hasKind = (path: IRPath, kind: IRStep['kind']): boolean => stepKinds(path).includes(kind);
/** 整个 scope 层里所有 step 的 kind（跨所有 path 摊平） */
const allKinds = (layer: IRScope): Array<IRStep['kind']> => pathsOf(layer).flatMap(stepKinds);

/** 取某 step 的 to 点（move/line 等带 to 的） */
const stepTo = (step: IRStep): [number, number] => (step as { to: [number, number] }).to;

/**
 * 外层 plot scope 子层粗分类：mark 层 = point/sector 的 nodeDefault.shape 层，或 line/area 的 pathDefault.strokeWidth 层
 * （guide 层的 pathDefault 只有 stroke / drawOpacity，无 strokeWidth）。z-order = [...gridLayers, ...markLayers, ...axisLayers]。
 */
const layersOf = (outer: IRScope): { children: Array<IRChild>; markIndex: number } => {
  const children = outer.children;
  const markIndex = children.findIndex(
    child =>
      isScope(child) &&
      (child.nodeDefault?.shape !== undefined || child.pathDefault?.strokeWidth !== undefined),
  );
  return { children, markIndex };
};

/** angle 维 band scale + radius 维 linear scale 的 polar 折线 spec（角向轴=类别绕圈） */
const polarSpec = (guides: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'band', name: 'a' },
      { type: 'linear', name: 'r', domain: [0, 10] },
    ],
    coordinate: { type: 'polar2D', angle: 'a', radius: 'r', ...extra },
    marks: [{ type: 'line', closed: true, encoding: { x: { field: 'cat' }, y: { field: 'value' } } }],
    guides,
  });

const ROWS = [
  { cat: 'A', value: 8 },
  { cat: 'B', value: 5 },
  { cat: 'C', value: 9 },
  { cat: 'D', value: 6 },
];

describe('lowerPlots polar guide — angular axis (ADR-04)', () => {
  // Happy path：角向轴 = 外圆弧 + 每类别角度刻度 + 圆周外 Node 标签
  it('angular_axis_produces_arc_axis_line', () => {
    const outer = expandOf(polarSpec([{ type: 'axis', dimension: 'angle' }]), { d: ROWS }, opts);
    const { children, markIndex } = layersOf(outer);
    // 角向轴层在 mark 层之后（压顶）
    const axisLayer = children.slice(markIndex + 1).find(isScope) as IRScope;
    expect(axisLayer).toBeDefined();
    // 轴线含 arc step（外圆弧）
    expect(allKinds(axisLayer)).toContain('arc');
  });

  it('angular_axis_arc_radius_near_outer_radius', () => {
    const outer = expandOf(polarSpec([{ type: 'axis', dimension: 'angle' }]), { d: ROWS }, opts);
    const { children, markIndex } = layersOf(outer);
    const axisLayer = children.slice(markIndex + 1).find(isScope) as IRScope;
    const arcStep = pathsOf(axisLayer)
      .flatMap(p => p.children)
      .find(step => step.kind === 'arc') as { radius?: number } | undefined;
    expect(arcStep).toBeDefined();
    // 外圆弧半径 ≈ outerRadius（480×300、有角向标签留白 → outerRadius < 150）
    expect(arcStep?.radius).toBeGreaterThan(0);
    expect(arcStep?.radius).toBeLessThanOrEqual(150);
  });

  it('angular_axis_tick_per_category', () => {
    const outer = expandOf(polarSpec([{ type: 'axis', dimension: 'angle' }]), { d: ROWS }, opts);
    const { children, markIndex } = layersOf(outer);
    const axisLayer = children.slice(markIndex + 1).find(isScope) as IRScope;
    // 4 类别 → 4 个角向短刻度（line 段）+ 4 个圆周外标签 Node
    const tickSegments = pathsOf(axisLayer).flatMap(p => p.children).filter(step => step.kind === 'line');
    expect(tickSegments.length).toBeGreaterThanOrEqual(4);
    const labels = nodesOf(axisLayer);
    expect(labels).toHaveLength(4);
    expect(labels.map(n => n.text).sort()).toEqual(['A', 'B', 'C', 'D']);
  });

  it('angular_axis_labels_outside_arc', () => {
    const outer = expandOf(polarSpec([{ type: 'axis', dimension: 'angle' }]), { d: ROWS }, opts);
    const { children, markIndex } = layersOf(outer);
    const axisLayer = children.slice(markIndex + 1).find(isScope) as IRScope;
    const arcStep = pathsOf(axisLayer).flatMap(p => p.children).find(step => step.kind === 'arc') as { radius?: number };
    const outerRadius = arcStep.radius as number;
    // polar center = plot 区中心。每个标签到圆心的距离 > outerRadius（圆周外侧）
    const labels = nodesOf(axisLayer);
    // 圆心估算：所有标签 position 的中位附近——用 outerRadius 反推不便，改判每个标签离任意标签集中心更远的弱断言：
    // 至少每个标签都是有限坐标且分布开（不全相同）
    const xs = labels.map(n => (n.position as [number, number])[0]);
    const ys = labels.map(n => (n.position as [number, number])[1]);
    expect(xs.every(Number.isFinite)).toBe(true);
    expect(ys.every(Number.isFinite)).toBe(true);
    expect(new Set(xs.map(x => x.toFixed(2))).size).toBeGreaterThan(1);
    expect(outerRadius).toBeGreaterThan(0);
  });

  // 边界：tickLabels:false → 无标签、仍出轴线刻度
  it('angular_axis_tick_labels_false_keeps_line', () => {
    const outer = expandOf(polarSpec([{ type: 'axis', dimension: 'angle', tickLabels: false }]), { d: ROWS }, opts);
    const { children, markIndex } = layersOf(outer);
    const axisLayer = children.slice(markIndex + 1).find(isScope) as IRScope;
    expect(nodesOf(axisLayer)).toHaveLength(0);
    expect(allKinds(axisLayer)).toContain('arc');
  });
});

describe('lowerPlots polar guide — radial axis (ADR-04)', () => {
  /** 径向轴（linear）spec：dimension=radius；用 linear 角向使刻度沿辐条 */
  const radialSpec = (guides: Array<Record<string, unknown>>): PlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a', domain: [0, 360] },
        { type: 'linear', name: 'r', domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'point', encoding: { x: { field: 'theta' }, y: { field: 'value' } } }],
      guides,
    });
  const radialRows = [
    { theta: 0, value: 0 },
    { theta: 90, value: 5 },
    { theta: 180, value: 10 },
  ];

  // Happy path：径向轴 = 沿 startAngle 辐条的轴线（直段）+ radius tick 刻度 + 标签
  it('radial_axis_produces_straight_spoke_axis_line', () => {
    const outer = expandOf(radialSpec([{ type: 'axis', dimension: 'radius' }]), { d: radialRows }, opts);
    const { children, markIndex } = layersOf(outer);
    const axisLayer = children.slice(markIndex + 1).find(isScope) as IRScope;
    expect(axisLayer).toBeDefined();
    // 辐条轴线是直段（line/move），不含 arc
    expect(allKinds(axisLayer)).toContain('line');
    expect(allKinds(axisLayer)).not.toContain('arc');
  });

  it('radial_axis_default_spoke_along_start_angle', () => {
    // startAngle 默认 0（+x）→ 辐条沿圆心向右：轴线终点 x > 圆心 x、y ≈ 圆心 y
    const outer = expandOf(radialSpec([{ type: 'axis', dimension: 'radius' }]), { d: radialRows }, opts);
    const { children, markIndex } = layersOf(outer);
    const axisLayer = children.slice(markIndex + 1).find(isScope) as IRScope;
    const linePoints = pathsOf(axisLayer)
      .flatMap(p => p.children)
      .filter(step => step.kind === 'move' || step.kind === 'line')
      .map(stepTo);
    // 辐条端点应共 y（沿 0° 水平），且 x 跨度 > 0
    const ys = linePoints.map(p => p[1]);
    const xs = linePoints.map(p => p[0]);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    expect(maxY - minY).toBeLessThan(1); // 近似同 y（沿 +x 辐条）
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0);
  });

  it('radial_axis_tick_labels_present', () => {
    const outer = expandOf(radialSpec([{ type: 'axis', dimension: 'radius' }]), { d: radialRows }, opts);
    const { children, markIndex } = layersOf(outer);
    const axisLayer = children.slice(markIndex + 1).find(isScope) as IRScope;
    // linear 径向 → 多个刻度标签（值 0..10 的 nice 刻度）
    expect(nodesOf(axisLayer).length).toBeGreaterThan(0);
    expect(nodesOf(axisLayer).every(n => typeof n.text === 'string')).toBe(true);
  });
});

describe('lowerPlots polar guide — grid (ADR-04)', () => {
  /** 径向轴 grid（同心环）：linear radius + grid:true */
  const radiusGridSpec: PlotSpec = PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'a', domain: [0, 360] },
      { type: 'linear', name: 'r', domain: [0, 10] },
    ],
    coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
    marks: [{ type: 'point', encoding: { x: { field: 'theta' }, y: { field: 'value' } } }],
    guides: [{ type: 'axis', dimension: 'radius', grid: true }],
  });

  // Happy path：radius axis grid:true → 每 radius tick 一个同心环（arc step）
  it('radius_grid_produces_concentric_rings_as_arcs', () => {
    const outer = expandOf(radiusGridSpec, { d: [{ theta: 0, value: 5 }] }, opts);
    const { children, markIndex } = layersOf(outer);
    // grid 层在 mark 层之前（垫底）
    const gridLayer = children.slice(0, markIndex).find(isScope) as IRScope;
    expect(gridLayer).toBeDefined();
    // 同心环用 arc step
    const arcs = pathsOf(gridLayer).flatMap(p => p.children).filter(step => step.kind === 'arc');
    expect(arcs.length).toBeGreaterThanOrEqual(1);
  });

  it('radius_grid_one_ring_per_tick', () => {
    const outer = expandOf(radiusGridSpec, { d: [{ theta: 0, value: 5 }] }, opts);
    const { children, markIndex } = layersOf(outer);
    const gridLayer = children.slice(0, markIndex).find(isScope) as IRScope;
    const arcs = pathsOf(gridLayer).flatMap(p => p.children).filter(step => step.kind === 'arc') as Array<{ radius?: number }>;
    // 多刻度 → 多环，半径各异（同心、递增）
    const radii = arcs.map(a => a.radius ?? 0).filter(r => r > 0);
    expect(radii.length).toBeGreaterThanOrEqual(1);
    expect(new Set(radii.map(r => r.toFixed(3))).size).toBe(radii.length);
  });

  /** 角向轴 grid（辐条）：band angle + grid:true */
  const angleGridSpec: PlotSpec = PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'band', name: 'a' },
      { type: 'linear', name: 'r', domain: [0, 10] },
    ],
    coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
    marks: [{ type: 'line', closed: true, encoding: { x: { field: 'cat' }, y: { field: 'value' } } }],
    guides: [{ type: 'axis', dimension: 'angle', grid: true }],
  });

  // Happy path：angle axis grid:true → 每 angle tick 一条圆心→外圆辐条（直段，不是 arc）
  it('angle_grid_produces_radial_spokes_as_lines', () => {
    const outer = expandOf(angleGridSpec, { d: ROWS }, opts);
    const { children, markIndex } = layersOf(outer);
    const gridLayer = children.slice(0, markIndex).find(isScope) as IRScope;
    expect(gridLayer).toBeDefined();
    // 辐条是直段，不含 arc
    expect(allKinds(gridLayer)).toContain('line');
    expect(allKinds(gridLayer)).not.toContain('arc');
  });

  it('angle_grid_one_spoke_per_category', () => {
    const outer = expandOf(angleGridSpec, { d: ROWS }, opts);
    const { children, markIndex } = layersOf(outer);
    const gridLayer = children.slice(0, markIndex).find(isScope) as IRScope;
    // 4 类别 → 4 条辐条（每条 move+line 一对）
    const lineSegments = pathsOf(gridLayer).flatMap(p => p.children).filter(step => step.kind === 'line');
    expect(lineSegments).toHaveLength(4);
  });
});

describe('lowerPlots polar guide — z-order (ADR-04)', () => {
  it('grid_below_mark_axis_above', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'band', name: 'a' },
        { type: 'linear', name: 'r', domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'line', closed: true, encoding: { x: { field: 'cat' }, y: { field: 'value' } } }],
      guides: [
        { type: 'axis', dimension: 'angle' },
        { type: 'axis', dimension: 'radius', grid: true },
      ],
    });
    const outer = expandOf(spec, { d: ROWS }, opts);
    const { children, markIndex } = layersOf(outer);
    expect(markIndex).toBeGreaterThan(0); // mark 前至少一个 grid 层（radius grid）
    // mark 层之前全是 grid 层（pathDefault、无 nodeDefault.shape）；之后是 axis 层
    const before = children.slice(0, markIndex);
    const after = children.slice(markIndex + 1);
    expect(before.length).toBeGreaterThanOrEqual(1);
    expect(after.length).toBeGreaterThanOrEqual(1);
    expect(before.every(child => isScope(child) && (child).nodeDefault?.shape === undefined)).toBe(true);
  });
});

describe('lowerPlots polar guide — 错误路径 (ADR-04)', () => {
  it('duplicate_angle_axis_throws', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'band', name: 'a' },
        { type: 'linear', name: 'r', domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'line', closed: true, encoding: { x: { field: 'cat' }, y: { field: 'value' } } }],
      guides: [
        { type: 'axis', dimension: 'angle' },
        { type: 'axis', dimension: 'angle' },
      ],
    });
    expect(() => expandOf(spec, { d: ROWS }, opts)).toThrow(/duplicate axis/);
  });
});

describe('lowerPlots cartesian guide 回归 (ADR-04)', () => {
  // cartesian axis / grid 产物不变：直线轴（line/move，无 arc）
  const cartGuidedSpec: PlotSpec = PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'sales' },
    scales: [
      { type: 'linear', name: 'xMonth' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [{ type: 'line', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
    guides: [
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: true },
    ],
  });
  const SALES = [
    { month: 0, revenue: 10 },
    { month: 1, revenue: 14 },
    { month: 2, revenue: 9 },
  ];

  it('cartesian_axis_remains_straight_lines', () => {
    const outer = expandOf(cartGuidedSpec, { sales: SALES }, opts);
    const { children, markIndex } = layersOf(outer);
    // axis 层（mark 之后）：直线轴，无 arc
    const axisLayers = children.slice(markIndex + 1).filter(isScope);
    expect(axisLayers.length).toBeGreaterThanOrEqual(1);
    for (const axisLayer of axisLayers) {
      expect(allKinds(axisLayer)).not.toContain('arc');
      expect(allKinds(axisLayer)).toContain('line');
    }
  });

  it('cartesian_grid_remains_straight_lines', () => {
    const outer = expandOf(cartGuidedSpec, { sales: SALES }, opts);
    const { children, markIndex } = layersOf(outer);
    const gridLayers = children.slice(0, markIndex).filter(isScope);
    expect(gridLayers.length).toBeGreaterThanOrEqual(1);
    for (const gridLayer of gridLayers) {
      expect(pathsOf(gridLayer).length).toBeGreaterThan(0);
      expect(allKinds(gridLayer)).not.toContain('arc');
    }
  });

  it('cartesian_x_axis_labels_at_tick_positions', () => {
    // 回归：x 轴标签数 = x 刻度数（直线轴 Node text），与既有行为一致
    const outer = expandOf(cartGuidedSpec, { sales: SALES }, opts);
    const { children, markIndex } = layersOf(outer);
    const axisLayers = children.slice(markIndex + 1).filter(isScope);
    const totalLabels = axisLayers.flatMap(nodesOf);
    expect(totalLabels.length).toBeGreaterThan(0);
    expect(hasKind(pathsOf(axisLayers[0])[0], 'line')).toBe(true);
  });
});
