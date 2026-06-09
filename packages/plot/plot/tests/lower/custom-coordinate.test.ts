import type { IRNode, IRScope } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';
import { type AxisFrame, type CustomCoordinateFactory, type CustomFrame, type DimensionRole, createCustomFrame } from '../../src/lower/project';

/**
 * 自定义坐标系（custom coordinate，实验性）lowering 测试。
 * IR 只存 `{type:'custom', name, roles, params}`（JSON 安全）；投影函数由运行时 options.coordinates 工厂提供。
 * 证明 projectRoles 足以表达任意坐标系几何（曲线一维 / 拱形 x 轴），无需「轴」抽象、不破坏 IR 序列化。
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

const expandOf = (spec: PlotSpec, datasets: Datasets, options?: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

const firstLayer = (spec: PlotSpec, datasets: Datasets, options?: LowerPlotsOptions): IRScope =>
  expandOf(spec, datasets, options).children[0] as IRScope;

const positionsOf = (layer: IRScope): Array<[number, number]> =>
  layer.children.map(child => (child as IRNode).position as [number, number]);

const WIDTH = 480;
const HEIGHT = 240;
const opts = (coordinates: Record<string, CustomCoordinateFactory>): LowerPlotsOptions => ({ width: WIDTH, height: HEIGHT, coordinates });

const MID_Y = HEIGHT / 2;
const AMPLITUDE = 50;
const CYCLES = 1.5;
/** 示例工厂：一维曲线坐标系——单值沿正弦曲线落点（curve = 屏幕x → 屏幕y） */
const sineCoordinate: CustomCoordinateFactory = context => {
  const scale = context.linearScaleFor('x', [0, context.width]);
  const amplitude = context.params.amplitude ?? AMPLITUDE;
  const cycles = context.params.cycles ?? CYCLES;
  return createCustomFrame(['x'], values => {
    const screenX = scale.coordinate(values[0]);
    if (!Number.isFinite(screenX)) return null;
    return [screenX, MID_Y - amplitude * Math.sin((screenX / context.width) * 2 * Math.PI * cycles)];
  });
};

const ARCH_HEIGHT = 70;
/** 示例工厂：二维桥坐标系——x 沿拱、y 竖直偏移（加性可分离）；回传解析 frameAlong 让曲线轴精确 */
const bridgeCoordinate: CustomCoordinateFactory = context => {
  const xScale = context.linearScaleFor('x', [0, context.width]);
  const yScale = context.linearScaleFor('y', [context.height - 40, 40]);
  const archHeight = context.params.archHeight ?? ARCH_HEIGHT;
  const projectRoles = (values: ReadonlyArray<unknown>): [number, number] | null => {
    const screenX = xScale.coordinate(values[0]);
    const yOffset = yScale.coordinate(values[1]);
    if (!Number.isFinite(screenX) || !Number.isFinite(yOffset)) return null;
    const t = screenX / context.width;
    return [screenX, yOffset - archHeight * (1 - (2 * t - 1) ** 2)];
  };
  // 解析切向：线性 scale 斜率为常量；∂γ/∂x 沿拱（dY/dx = 4·archHeight·u·xSlope/width，u=2sx/width−1）、∂γ/∂y 竖直
  const xSlope = xScale.coordinate(1) - xScale.coordinate(0);
  const ySlope = yScale.coordinate(1) - yScale.coordinate(0);
  const frameAlong = (role: DimensionRole, values: ReadonlyArray<unknown>): AxisFrame | null => {
    const origin = projectRoles(values);
    if (!origin) return null;
    if (role === 'y') return { origin, tangent: [0, ySlope] };
    const screenX = xScale.coordinate(values[0]);
    const u = (2 * screenX) / context.width - 1;
    return { origin, tangent: [xSlope, (4 * archHeight * u * xSlope) / context.width] };
  };
  // options 对象（ADR-05 定稿）：roleScales → guide 画曲线轴；frameAlong → 轴切向精确
  return createCustomFrame(['x', 'y'], projectRoles, { roleScales: { x: xScale, y: yScale }, frameAlong });
};

const sineSpec = (): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [],
    coordinate: { type: 'custom', name: 'sine', roles: ['x'] },
    marks: [{ type: 'point', encoding: { x: { field: 'v' } } }],
  });

const bridgeSpec = (): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [],
    coordinate: { type: 'custom', name: 'bridge', roles: ['x', 'y'], params: { archHeight: ARCH_HEIGHT } },
    marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
  });

describe('custom coordinate — 一维曲线（projectRoles 沿正弦）', () => {
  it('点落在正弦曲线上（一维坐标系不止直线）', () => {
    const rows = Array.from({ length: 13 }, (_unused, i) => ({ v: i }));
    const scaleAt = (v: number): number => (v / 12) * WIDTH; // 线性 domain[0,12]→[0,WIDTH]
    const positions = positionsOf(firstLayer(sineSpec(), { d: rows }, opts({ sine: sineCoordinate })));
    expect(positions).toHaveLength(13);
    for (const row of rows) {
      const sx = scaleAt(row.v);
      const expectedY = MID_Y - AMPLITUDE * Math.sin((sx / WIDTH) * 2 * Math.PI * CYCLES);
      const found = positions.find(p => Math.abs(p[0] - sx) < 1e-6)!;
      expect(found[1]).toBeCloseTo(expectedY, 6);
    }
    // 曲线确有起伏（非退化直线）
    expect(new Set(positions.map(p => p[1].toFixed(2))).size).toBeGreaterThan(3);
  });

  it('下沉产物是合法 core IR（compileToScene 不抛）', () => {
    const layer = firstLayer(sineSpec(), { d: [{ v: 0 }, { v: 6 }, { v: 12 }] }, opts({ sine: sineCoordinate }));
    expect(() => compileToScene({ version: 1, type: 'scene', children: [layer] })).not.toThrow();
  });

  it('custom 坐标系 IR JSON round-trip（投影函数不在 IR）', () => {
    const ir = sineSpec().coordinate;
    expect(JSON.parse(JSON.stringify(ir))).toEqual({ type: 'custom', name: 'sine', roles: ['x'] });
  });
});

describe('custom coordinate — 二维桥（x 沿拱、y 竖直）', () => {
  it('点落在「拱形 x 基线 + 竖直 y」上（坐标系形态任意切换）', () => {
    const rows: Array<Record<string, number>> = [];
    for (const x of [0, 5, 10]) for (const y of [0, 10]) rows.push({ x, y });
    const xAt = (x: number): number => (x / 10) * WIDTH;
    const yAt = (y: number): number => HEIGHT - 40 + (y / 10) * (40 - (HEIGHT - 40));
    const positions = positionsOf(firstLayer(bridgeSpec(), { d: rows }, opts({ bridge: bridgeCoordinate })));
    expect(positions).toHaveLength(6);
    rows.forEach((row, index) => {
      const sx = xAt(row.x);
      const t = sx / WIDTH;
      const expected: [number, number] = [sx, yAt(row.y) - ARCH_HEIGHT * (1 - (2 * t - 1) ** 2)];
      expect(positions[index][0]).toBeCloseTo(expected[0], 6);
      expect(positions[index][1]).toBeCloseTo(expected[1], 6);
    });
    // 拱弯曲：y=0 行中点比两端更靠上（y 更小）
    const base = rows.map((row, index) => ({ x: row.x, y: row.y, p: positions[index] })).filter(entry => entry.y === 0);
    expect(base.find(entry => entry.x === 5)!.p[1]).toBeLessThan(base.find(entry => entry.x === 0)!.p[1]);
  });
});

describe('custom coordinate — 契约 / fail-loud', () => {
  // 未注册工厂 → fail-loud
  it('unknown_factory_fails_loud', () => {
    expect(() => expandOf(sineSpec(), { d: [{ v: 1 }] }, opts({ bridge: bridgeCoordinate }))).toThrow(/custom coordinate "sine"|no registered factory/i);
  });

  // 缺必填角色（roles 含 y、mark 缺 y）→ fail-loud（必填角色取 coordinate.roles）
  it('missing_required_role_fails_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'custom', name: 'bridge', roles: ['x', 'y'] },
      marks: [{ type: 'point', encoding: { x: { field: 'x' } } }],
    });
    expect(() => expandOf(spec, { d: [{ x: 1 }] }, opts({ bridge: bridgeCoordinate }))).toThrow(/custom coordinate "bridge"|requires|y/i);
  });

  // 非法 guide 维度（roles=['x','y']、axis dimension 'angle'）→ fail-loud（合法集取 roles）
  it('invalid_guide_dimension_fails_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'custom', name: 'bridge', roles: ['x', 'y'] },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
      guides: [{ type: 'axis', dimension: 'angle' }],
    });
    expect(() => expandOf(spec, { d: [{ x: 1, y: 2 }] }, opts({ bridge: bridgeCoordinate }))).toThrow(/custom coordinate "bridge"|not support|angle/i);
  });

  // 非 point mark（line）→ fail-loud（custom 本轮仅 point）
  it('non_point_mark_fails_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'custom', name: 'sine', roles: ['x'] },
      marks: [{ type: 'line', encoding: { x: { field: 'v' }, y: { field: 'v' } } }],
    });
    expect(() => expandOf(spec, { d: [{ v: 1 }, { v: 2 }] }, opts({ sine: sineCoordinate }))).toThrow(/custom coordinate|point only|not supported/i);
  });

  // 曲线轴：工厂回传 roleScales → <Axis> 沿投影画弯曲轴线（产出轴层 + 至少一条 path）
  it('custom_axis_guide_lowers_curved_axis', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'custom', name: 'bridge', roles: ['x', 'y'], params: { archHeight: ARCH_HEIGHT } },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
      guides: [
        { type: 'axis', dimension: 'x' },
        { type: 'axis', dimension: 'y' },
      ],
    });
    const root = expandOf(spec, { d: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }, opts({ bridge: bridgeCoordinate }));
    // mark 层 + 2 条轴层
    expect(root.children.length).toBeGreaterThanOrEqual(3);
    // x 轴层含一条多点折线（弯曲轴线）：找到带 ≥4 个 step 的 path（密采样）
    const axisLayer = root.children[root.children.length - 2] as IRScope;
    const hasPolyline = axisLayer.children.some(child => {
      const path = child as { type?: string; children?: Array<unknown> };
      return path.type === 'path' && (path.children?.length ?? 0) >= 4;
    });
    expect(hasPolyline).toBe(true);
  });

  // custom × categorical color → 分色子 Scope（非位置通道仍工作）
  it('custom_with_color_groups_into_subscopes', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'ordinal', name: 'col', range: ['#aa', '#bb'] }],
      coordinate: { type: 'custom', name: 'sine', roles: ['x'] },
      marks: [{ type: 'point', encoding: { x: { field: 'v' }, color: { field: 'g', scale: 'col' } } }],
    });
    const layer = firstLayer(spec, { d: [{ v: 1, g: 'X' }, { v: 9, g: 'Y' }] }, opts({ sine: sineCoordinate }));
    expect(layer.children).toHaveLength(2);
  });
});

// ── ADR-05：frameAlong 单 role 轴标架契约 ───────────────────────────────────────────────
// 坐标系可选报某角色轴曲线在某点的局部标架（origin + 切向，屏幕空间）；曲线轴优先吃它、缺则数值差分回落。
// 法向 = 切向逆时针转 90°，由 guide 导出。维度无关：轴曲线永远 1D、永远有切向法向（2D custom 的单 role 轴亦然）。

/** 线性对角坐标系（projectRoles=[10x,10x]）：解析切向为常量 [10,10]，frame 级断言用（不依赖 context） */
const DIAGONAL_K = 10;
const diagonalFrame = (): CustomFrame => {
  const project = (values: ReadonlyArray<unknown>): [number, number] | null => {
    const x = Number(values[0]);
    return Number.isFinite(x) ? [x * DIAGONAL_K, x * DIAGONAL_K] : null;
  };
  const frameAlong = (_role: DimensionRole, values: ReadonlyArray<unknown>): AxisFrame | null => {
    const origin = project(values);
    return origin ? { origin, tangent: [DIAGONAL_K, DIAGONAL_K] } : null;
  };
  return createCustomFrame(['x'], project, { frameAlong });
};

/** 一维正弦坐标系 + roleScales；frameAlong 回传常量切向 [1,0]（法向恒 [0,1]，刻度短线竖直，证明被消费） */
const sineFramedTangentX: CustomCoordinateFactory = context => {
  const scale = context.linearScaleFor('x', [0, context.width]);
  const projectRoles = (values: ReadonlyArray<unknown>): [number, number] | null => {
    const sx = scale.coordinate(values[0]);
    if (!Number.isFinite(sx)) return null;
    return [sx, MID_Y - AMPLITUDE * Math.sin((sx / context.width) * 2 * Math.PI * CYCLES)];
  };
  const frameAlong = (_role: DimensionRole, values: ReadonlyArray<unknown>): AxisFrame | null => {
    const origin = projectRoles(values);
    return origin ? { origin, tangent: [1, 0] } : null;
  };
  return createCustomFrame(['x'], projectRoles, { roleScales: { x: scale }, frameAlong });
};

/** 同上但不回传 frameAlong → 曲线轴走数值差分回落 */
const sineNumeric: CustomCoordinateFactory = context => {
  const scale = context.linearScaleFor('x', [0, context.width]);
  const projectRoles = (values: ReadonlyArray<unknown>): [number, number] | null => {
    const sx = scale.coordinate(values[0]);
    if (!Number.isFinite(sx)) return null;
    return [sx, MID_Y - AMPLITUDE * Math.sin((sx / context.width) * 2 * Math.PI * CYCLES)];
  };
  return createCustomFrame(['x'], projectRoles, { roleScales: { x: scale } });
};

/** 退化坐标系：frameAlong 回传零切向 [0,0]，验证法向导出 guard 不产生 NaN */
const degenerateFramed: CustomCoordinateFactory = context => {
  const scale = context.linearScaleFor('x', [0, context.width]);
  const projectRoles = (values: ReadonlyArray<unknown>): [number, number] | null => {
    const sx = scale.coordinate(values[0]);
    return Number.isFinite(sx) ? [sx, MID_Y] : null;
  };
  const frameAlong = (_role: DimensionRole, values: ReadonlyArray<unknown>): AxisFrame | null => {
    const origin = projectRoles(values);
    return origin ? { origin, tangent: [0, 0] } : null;
  };
  return createCustomFrame(['x'], projectRoles, { roleScales: { x: scale }, frameAlong });
};

const sineAxisSpec = (): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [],
    coordinate: { type: 'custom', name: 'sine', roles: ['x'] },
    marks: [{ type: 'point', encoding: { x: { field: 'v' } } }],
    guides: [{ type: 'axis', dimension: 'x' }],
  });

// 轴层 = root 下含 path 子节点的 scope（point mark 层只有 node、被过滤掉）
type StepLike = { kind?: string; to?: [number, number] };
type PathLike = { type?: string; children?: Array<StepLike> };
type LayerLike = { type?: string; children?: Array<{ type?: string }> };
const axisLayersOf = (root: IRScope): Array<IRScope> =>
  (root.children as ReadonlyArray<unknown> as Array<LayerLike>).filter(child => child.type === 'scope' && (child.children ?? []).some(grandchild => grandchild.type === 'path')) as unknown as Array<IRScope>;
const pathsOf = (layer: IRScope): Array<PathLike> => (layer.children as Array<PathLike>).filter(child => child.type === 'path');
const moveCount = (path: PathLike): number => (path.children ?? []).filter(step => step.kind === 'move').length;
/** 轴线 polyline（恰 1 个 move 的 path）的步数 */
const polylineStepsOf = (layer: IRScope): number => pathsOf(layer).find(path => moveCount(path) === 1)?.children?.length ?? 0;
/** 刻度短线（> 1 个 move 的 path）各段向量 [Δx, Δy] */
const tickSegmentsOf = (layer: IRScope): Array<[number, number]> => {
  const steps = pathsOf(layer).find(path => moveCount(path) > 1)?.children ?? [];
  const segments: Array<[number, number]> = [];
  for (let i = 0; i + 1 < steps.length; i += 2) {
    const from = steps[i].to;
    const to = steps[i + 1].to;
    if (from && to) segments.push([to[0] - from[0], to[1] - from[1]]);
  }
  return segments;
};
const labelNodesOf = (layer: IRScope): Array<IRNode> => (layer.children as Array<IRNode>).filter(child => (child as { type?: string }).type === 'node');

describe('custom coordinate — frameAlong 局部标架契约（ADR-05）', () => {
  it('framealong_origin_matches_project_roles', () => {
    // frameAlong(role,p).origin 与 projectRoles(p) 逐分量近似相等；projectRoles 为 null 时同返 null（非引用相等）
    const frame = diagonalFrame();
    for (const x of [0, 1, 3.5, 7]) {
      const local = frame.frameAlong!('x', [x]);
      const projected = frame.projectRoles([x]);
      expect(local).not.toBeNull();
      expect(projected).not.toBeNull();
      expect(local!.origin[0]).toBeCloseTo(projected![0], 6);
      expect(local!.origin[1]).toBeCloseTo(projected![1], 6);
    }
    expect(frame.projectRoles(['oops'])).toBeNull();
    expect(frame.frameAlong!('x', ['oops'])).toBeNull();
  });

  it('framealong_tangent_along_axis_curve', () => {
    // 解析切向方向 ≈ 中心差分方向（归一化后 dot ≈ 1）
    const frame = diagonalFrame();
    const h = 1e-4;
    const before = frame.projectRoles([4 - h])!;
    const after = frame.projectRoles([4 + h])!;
    const numeric: [number, number] = [after[0] - before[0], after[1] - before[1]];
    const analytic = frame.frameAlong!('x', [4])!.tangent;
    const unit = (vector: [number, number]): [number, number] => {
      const length = Math.hypot(vector[0], vector[1]);
      return [vector[0] / length, vector[1] / length];
    };
    const a = unit(numeric);
    const b = unit(analytic);
    expect(a[0] * b[0] + a[1] * b[1]).toBeCloseTo(1, 6);
  });

  it('curved_axis_consumes_framealong_tangent', () => {
    // frameAlong 回传常量切向 [1,0] → 法向恒 [0,1] → 所有刻度短线竖直（Δx≈0）；数值差分在正弦上做不到
    const rows = Array.from({ length: 13 }, (_unused, i) => ({ v: i }));
    const root = expandOf(sineAxisSpec(), { d: rows }, opts({ sine: sineFramedTangentX }));
    const axisLayer = axisLayersOf(root)[0];
    const segments = tickSegmentsOf(axisLayer);
    expect(segments.length).toBeGreaterThan(0);
    for (const [dx] of segments) expect(Math.abs(dx)).toBeLessThan(1e-6);
  });

  it('framealong_absent_falls_back_to_numeric_sampling', () => {
    // 不回传 frameAlong → 仍画弯曲轴线（polyline ≥ 4 步）；法向随正弦斜率变化、刻度短线非全竖直
    const rows = Array.from({ length: 13 }, (_unused, i) => ({ v: i }));
    const root = expandOf(sineAxisSpec(), { d: rows }, opts({ sine: sineNumeric }));
    const axisLayer = axisLayersOf(root)[0];
    expect(polylineStepsOf(axisLayer)).toBeGreaterThanOrEqual(4);
    const segments = tickSegmentsOf(axisLayer);
    expect(segments.some(([dx]) => Math.abs(dx) > 1e-6)).toBe(true);
  });

  it('degenerate_tangent_guarded_no_nan', () => {
    // 零切向 [0,0] → 法向导出有 guard，标签位置仍有限（不出 NaN）
    const rows = Array.from({ length: 5 }, (_unused, i) => ({ v: i }));
    const root = expandOf(sineAxisSpec(), { d: rows }, opts({ sine: degenerateFramed }));
    const labels = labelNodesOf(axisLayersOf(root)[0]);
    expect(labels.length).toBeGreaterThan(0);
    for (const node of labels) {
      const position = node.position as [number, number];
      expect(Number.isFinite(position[0])).toBe(true);
      expect(Number.isFinite(position[1])).toBe(true);
    }
  });

  it('curved_axis_normal_uses_axis_tangent_even_when_custom_roles_are_2d', () => {
    // 2D custom（roles=['x','y']）的 x 轴仍是 1D 曲线：画成弯曲轴线 + 标签沿轴法向偏移、位置有限
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'custom', name: 'bridge', roles: ['x', 'y'], params: { archHeight: ARCH_HEIGHT } },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
      guides: [{ type: 'axis', dimension: 'x' }],
    });
    const rows: Array<Record<string, number>> = [];
    for (const x of [0, 5, 10]) for (const y of [0, 10]) rows.push({ x, y });
    const root = expandOf(spec, { d: rows }, opts({ bridge: bridgeCoordinate }));
    const axisLayer = axisLayersOf(root)[0];
    expect(polylineStepsOf(axisLayer)).toBeGreaterThanOrEqual(4);
    const labels = labelNodesOf(axisLayer);
    expect(labels.length).toBeGreaterThan(0);
    for (const node of labels) {
      const position = node.position as [number, number];
      expect(Number.isFinite(position[0])).toBe(true);
      expect(Number.isFinite(position[1])).toBe(true);
    }
  });
});
