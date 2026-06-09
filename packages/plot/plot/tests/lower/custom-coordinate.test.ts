import type { IRNode, IRScope } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';
import { type CustomCoordinateFactory, createCustomFrame } from '../../src/lower/project';

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
/** 示例工厂：二维桥坐标系——x 沿拱、y 竖直偏移（加性可分离） */
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
  // 回传 roleScales → guide 可画曲线轴
  return createCustomFrame(['x', 'y'], projectRoles, { x: xScale, y: yScale });
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
