import type { IRNode, IRPath, IRScope } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal, number, object } from 'zod';

import type { AnyCoordinateDefinition, AxisFrame, CoordinateFrame, DimensionRole } from '../../../src/contract';
import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import type { IRPlot } from '../../../src/schemas';

import { createCoordinateFrame, defineCoordinate } from '../../../src/contract';
import { lowerPlot } from '../../../src/pipeline/expand/lower';
import { PlotSchema } from '../../../src/schemas';

/**
 * 自定义坐标系（custom coordinate）lowering 测试。
 * IR 只存 `{type:<customType>, ...config}`（JSON 安全）；roles / 投影函数由运行时 CoordinateDefinition 提供。
 * 证明 projectRoles 足以表达任意坐标系几何（曲线一维 / 拱形 x 轴），无需「轴」抽象、不破坏 IR 序列化
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

const expandOf = (spec: IRPlot, datasets: Datasets, options?: LowerPlotsOptions): IRScope => {
  return lowerPlot(spec, datasets, options) as IRScope;
};

const firstLayer = (spec: IRPlot, datasets: Datasets, options?: LowerPlotsOptions): IRScope =>
  expandOf(spec, datasets, options).children[0] as IRScope;

const positionsOf = (layer: IRScope): Array<[number, number]> =>
  layer.children.map(child => (child as IRNode).position as [number, number]);

const isNumericPosition = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length === 2 && value.every(part => typeof part === 'number');

const WIDTH = 480;
const HEIGHT = 240;
const opts = (coordinates: Array<AnyCoordinateDefinition>): LowerPlotsOptions => ({
  width: WIDTH,
  height: HEIGHT,
  coordinates,
});

const MID_Y = HEIGHT / 2;
const AMPLITUDE = 50;
const CYCLES = 1.5;
/** 示例工厂：一维曲线坐标系——单值沿正弦曲线落点（curve = 屏幕x → 屏幕y） */
const sineCoordinate = defineCoordinate({
  schema: object({
    type: literal('sine').describe('Discriminator: sine custom coordinate operation'),
    amplitude: number().optional().describe('Sine amplitude in user units'),
    cycles: number().optional().describe('Number of sine cycles across the canvas'),
  }),
  roles: ['x'],
  resolve: (operation, context) => {
    const values = context.collectRoleValues('x');
    const scaleDef = context.resolveScaleForRole('x', undefined, values);
    const scale = context.buildPositionScale(scaleDef, values, [0, context.width]);
    const amplitude = operation.amplitude ?? AMPLITUDE;
    const cycles = operation.cycles ?? CYCLES;
    return {
      frame: createCoordinateFrame('sine', ['x'], roleValues => {
        const screenX = scale.coordinate(roleValues[0]);
        if (!Number.isFinite(screenX)) return null;
        return [screenX, MID_Y - amplitude * Math.sin((screenX / context.width) * 2 * Math.PI * cycles)];
      }),
      plotArea: { x: 0, y: 0, width: context.width, height: context.height },
      gridLayers: [],
      axisLayers: [],
    };
  },
});

const ARCH_HEIGHT = 70;
/** 示例工厂：二维桥坐标系——x 沿拱、y 竖直偏移（加性可分离）；回传解析 frameAlong 让曲线轴精确 */
const bridgeCoordinate = defineCoordinate({
  schema: object({
    type: literal('bridge').describe('Discriminator: bridge custom coordinate operation'),
    archHeight: number().optional().describe('Arch height in user units'),
  }),
  roles: ['x', 'y'],
  resolve: (operation, context) => {
    const xValues = context.collectRoleValues('x');
    const yValues = context.collectRoleValues('y');
    const xScale = context.buildPositionScale(context.resolveScaleForRole('x', undefined, xValues), xValues, [
      0,
      context.width,
    ]);
    const yScale = context.buildPositionScale(context.resolveScaleForRole('y', undefined, yValues), yValues, [
      context.height - 40,
      40,
    ]);
    const archHeight = operation.archHeight ?? ARCH_HEIGHT;
    const projectRoles = (values: ReadonlyArray<unknown>): [number, number] | null => {
      const screenX = xScale.coordinate(values[0]);
      const yOffset = yScale.coordinate(values[1]);
      if (!Number.isFinite(screenX) || !Number.isFinite(yOffset)) return null;
      const t = screenX / context.width;
      return [screenX, yOffset - archHeight * (1 - (2 * t - 1) ** 2)];
    };
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
    const frame = createCoordinateFrame('bridge', ['x', 'y'], projectRoles, {
      roleScales: { x: xScale, y: yScale },
      frameAlong,
    });
    const gridLayers: Array<IRScope> = [];
    const axisLayers: Array<IRScope> = [];
    for (const guide of context.axisGuides) {
      const lowered = context.lowerCustomAxis(frame, guide, context.fontSize, context.provenance);
      if (lowered.gridLayer) gridLayers.push(lowered.gridLayer);
      if (lowered.axisLayer) axisLayers.push(lowered.axisLayer);
    }
    return {
      frame,
      plotArea: { x: 0, y: 0, width: context.width, height: context.height },
      gridLayers,
      axisLayers,
    };
  },
});

const sineSpec = (): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [],
    coordinate: { type: 'sine' },
    marks: [{ type: 'point', encoding: { x: { field: 'v' } } }],
  });

const bridgeSpec = (): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [],
    coordinate: { type: 'bridge', archHeight: ARCH_HEIGHT },
    marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
  });

const uvCoordinate = defineCoordinate({
  schema: object({
    type: literal('uv').describe('Discriminator: uv custom coordinate operation'),
  }),
  roles: ['u', 'v'],
  resolve: (_operation, context) => {
    const uValues = context.collectRoleValues('u');
    const vValues = context.collectRoleValues('v');
    const uScale = context.buildPositionScale(context.resolveScaleForRole('u', undefined, uValues), uValues, [
      0,
      context.width,
    ]);
    const vScale = context.buildPositionScale(context.resolveScaleForRole('v', undefined, vValues), vValues, [
      context.height,
      0,
    ]);
    const projectRoles = (values: ReadonlyArray<unknown>): [number, number] | null => {
      const u = uScale.coordinate(values[0]);
      const v = vScale.coordinate(values[1]);
      return Number.isFinite(u) && Number.isFinite(v) ? [u, v] : null;
    };
    const frame = createCoordinateFrame('uv', ['u', 'v'], projectRoles, { roleScales: { u: uScale, v: vScale } });
    const gridLayers: Array<IRScope> = [];
    const axisLayers: Array<IRScope> = [];
    for (const guide of context.axisGuides) {
      const lowered = context.lowerCustomAxis(frame, guide, context.fontSize, context.provenance);
      if (lowered.gridLayer) gridLayers.push(lowered.gridLayer);
      if (lowered.axisLayer) axisLayers.push(lowered.axisLayer);
    }
    return {
      frame,
      plotArea: { x: 0, y: 0, width: context.width, height: context.height },
      gridLayers,
      axisLayers,
    };
  },
});

describe('custom coordinate — 一维曲线（projectRoles 沿正弦）', () => {
  it('点落在正弦曲线上（一维坐标系不止直线）', () => {
    const rows = Array.from({ length: 13 }, (_unused, i) => ({ v: i }));
    const scaleAt = (v: number): number => (v / 12) * WIDTH;
    const positions = positionsOf(firstLayer(sineSpec(), { d: rows }, opts([sineCoordinate])));
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
    const layer = firstLayer(sineSpec(), { d: [{ v: 0 }, { v: 6 }, { v: 12 }] }, opts([sineCoordinate]));
    expect(() => compileToScene({ version: 1, type: 'scene', children: [layer] }).scene).not.toThrow();
  });

  it('custom 坐标系 IR JSON round-trip（投影函数不在 IR）', () => {
    const ir = sineSpec().coordinate;
    expect(JSON.parse(JSON.stringify(ir))).toEqual({ type: 'sine' });
  });

  it('definition 返回的 frame type 必须与注册 type 一致', () => {
    const malformed = defineCoordinate({
      ...sineCoordinate,
      resolve: (operation, context) => {
        const resolution = sineCoordinate.resolve(operation, context);
        return { ...resolution, frame: { ...resolution.frame, type: 'other' } };
      },
    });
    expect(() => firstLayer(sineSpec(), { d: [{ v: 1 }] }, opts([malformed]))).toThrow(/sine.*frame type/);
  });

  it('definition 返回的 frame roles 必须与注册 roles 一致', () => {
    const malformed = defineCoordinate({
      ...sineCoordinate,
      resolve: (operation, context) => {
        const resolution = sineCoordinate.resolve(operation, context);
        return { ...resolution, frame: { ...resolution.frame, roles: ['y'] } };
      },
    });
    expect(() => firstLayer(sineSpec(), { d: [{ v: 1 }] }, opts([malformed]))).toThrow(/frame roles.*x/);
  });
});

describe('custom coordinate — 二维桥（x 沿拱、y 竖直）', () => {
  it('点落在「拱形 x 基线 + 竖直 y」上（坐标系形态任意切换）', () => {
    const rows: Array<Record<string, number>> = [];
    for (const x of [0, 5, 10]) for (const y of [0, 10]) rows.push({ x, y });
    const xAt = (x: number): number => (x / 10) * WIDTH;
    const yAt = (y: number): number => HEIGHT - 40 + (y / 10) * (40 - (HEIGHT - 40));
    const positions = positionsOf(firstLayer(bridgeSpec(), { d: rows }, opts([bridgeCoordinate])));
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

  it('custom_role_names_survive_schema_and_drive_projection_and_axis', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'uv' },
      marks: [{ type: 'point', encoding: { u: { field: 'u' }, v: { field: 'v' } } }],
      guides: [{ type: 'axis', dimension: 'u' }],
    });
    const root = expandOf(
      spec,
      {
        d: [
          { u: 0, v: 0 },
          { u: 10, v: 10 },
        ],
      },
      opts([uvCoordinate]),
    );
    const points = positionsOf(root.children[0] as IRScope);
    expect(points).toHaveLength(2);
    expect(points[0]).toEqual([0, HEIGHT]);
    expect(points[1]).toEqual([WIDTH, 0]);
    expect(axisLayersOf(root)).toHaveLength(1);
  });
});

describe('custom coordinate — 契约 / fail-loud', () => {
  it('coordinate_frame_preserves_registered_coordinate_type', () => {
    const frame = createCoordinateFrame('bridge', ['x', 'y'], values => [Number(values[0]), Number(values[1])]);
    expect(frame.type).toBe('bridge');
  });

  // 未注册工厂 → fail-loud
  it('unknown_factory_fails_loud', () => {
    expect(() => expandOf(sineSpec(), { d: [{ v: 1 }] }, opts([bridgeCoordinate]))).toThrow(
      /coordinate type "sine" is not registered/i,
    );
  });

  // 缺必填角色（roles 含 y、mark 缺 y）→ fail-loud（必填角色取 coordinate.roles）
  it('missing_required_role_fails_loud', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'bridge' },
      marks: [{ type: 'point', encoding: { x: { field: 'x' } } }],
    });
    expect(() => expandOf(spec, { d: [{ x: 1 }] }, opts([bridgeCoordinate]))).toThrow(
      /bridge coordinate system requires the "y" position channel/i,
    );
  });

  // 非法 guide 维度：schema 接受任意非空 role 名，坐标系 definition.roles 在 lowering 阶段 fail-loud
  it('invalid_guide_dimension_rejected_by_coordinate_definition_roles', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'bridge' },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
      guides: [{ type: 'axis', dimension: 'angle' }],
    });
    expect(() => expandOf(spec, { d: [{ x: 0, y: 0 }] }, opts([bridgeCoordinate]))).toThrow(
      /does not support axis dimension "angle"/,
    );
  });

  it('custom_open_path_uses_project_roles', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'bridge', archHeight: ARCH_HEIGHT },
      marks: [{ type: 'path', order: 'x', closed: false, encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
    });
    const rows = [
      { x: 0, y: 0 },
      { x: 5, y: 10 },
      { x: 10, y: 0 },
    ];
    const layer = firstLayer(spec, { d: rows }, opts([bridgeCoordinate]));
    const path = layer.children[0] as IRPath;
    const positions = path.children.flatMap(step => {
      if (step.kind !== 'move' && step.kind !== 'line') return [];
      const position = step.to;
      return isNumericPosition(position) ? [position] : [];
    });

    expect(positions).toHaveLength(3);
    rows.forEach((row, index) => {
      const screenX = (row.x / 10) * WIDTH;
      const screenY = HEIGHT - 40 + (row.y / 10) * (40 - (HEIGHT - 40));
      const t = screenX / WIDTH;
      expect(positions[index][0]).toBeCloseTo(screenX, 6);
      expect(positions[index][1]).toBeCloseTo(screenY - ARCH_HEIGHT * (1 - (2 * t - 1) ** 2), 6);
    });
  });

  it.each([
    ['closed cycle', { closed: true }],
    ['cycle closure', { closure: { kind: 'cycle' } }],
    ['baseline closure', { closure: { kind: 'baseline' } }],
    ['stack closure', { closure: { kind: 'stack', baselineField: 'baseline' } }],
  ])('custom_path_%s_remains_fail_loud', (_label, pathShape) => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'bridge' },
      marks: [
        {
          type: 'path',
          ...pathShape,
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
    });
    expect(() =>
      firstLayer(
        spec,
        {
          d: [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
          ],
        },
        opts([bridgeCoordinate]),
      ),
    ).toThrow(/path mark is not supported under the bridge coordinate system/);
  });

  // 曲线轴：工厂回传 roleScales → <Axis> 沿投影画弯曲轴线（产出轴层 + 至少一条 path）
  it('custom_axis_guide_lowers_curved_axis', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'bridge', archHeight: ARCH_HEIGHT },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
      guides: [
        { type: 'axis', dimension: 'x' },
        { type: 'axis', dimension: 'y' },
      ],
    });
    const root = expandOf(
      spec,
      {
        d: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
      },
      opts([bridgeCoordinate]),
    );
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
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'ordinal', name: 'col', range: ['#aa', '#bb'] }],
      coordinate: { type: 'sine' },
      marks: [{ type: 'point', color: { kind: 'field', value: 'g', scale: 'col' }, encoding: { x: { field: 'v' } } }],
    });
    const layer = firstLayer(
      spec,
      {
        d: [
          { v: 1, g: 'X' },
          { v: 9, g: 'Y' },
        ],
      },
      opts([sineCoordinate]),
    );
    expect(layer.children).toHaveLength(2);
  });
});

// ── contract：frameAlong 单 role 轴标架契约 ───────────────────────────────────────────────
// 坐标系可选报某角色轴曲线在某点的局部标架（origin + 切向，屏幕空间）；曲线轴优先吃它、缺则数值差分回落
// 法向 = 切向逆时针转 90°，由 guide 导出。维度无关：轴曲线永远 1D、永远有切向法向（2D custom 的单 role 轴亦然）

/** 线性对角坐标系（projectRoles=[10x,10x]）：解析切向为常量 [10,10]，frame 级断言用（不依赖 context） */
const DIAGONAL_K = 10;
const diagonalFrame = (): CoordinateFrame => {
  const project = (values: ReadonlyArray<unknown>): [number, number] | null => {
    const x = Number(values[0]);
    return Number.isFinite(x) ? [x * DIAGONAL_K, x * DIAGONAL_K] : null;
  };
  const frameAlong = (_role: DimensionRole, values: ReadonlyArray<unknown>): AxisFrame | null => {
    const origin = project(values);
    return origin ? { origin, tangent: [DIAGONAL_K, DIAGONAL_K] } : null;
  };
  return createCoordinateFrame('diagonal', ['x'], project, { frameAlong });
};

const defineSineCoordinate = (
  type: string,
  frameAlongOf?: (
    projectRoles: (values: ReadonlyArray<unknown>) => [number, number] | null,
  ) => (role: DimensionRole, values: ReadonlyArray<unknown>) => AxisFrame | null,
  flat = false,
): AnyCoordinateDefinition =>
  defineCoordinate({
    schema: object({ type: literal(type).describe('Discriminator: sine axis test coordinate operation') }),
    roles: ['x'],
    resolve: (_operation, context) => {
      const values = context.collectRoleValues('x');
      const scale = context.buildPositionScale(context.resolveScaleForRole('x', undefined, values), values, [
        0,
        context.width,
      ]);
      const projectRoles = (roleValues: ReadonlyArray<unknown>): [number, number] | null => {
        const sx = scale.coordinate(roleValues[0]);
        if (!Number.isFinite(sx)) return null;
        return flat ? [sx, MID_Y] : [sx, MID_Y - AMPLITUDE * Math.sin((sx / context.width) * 2 * Math.PI * CYCLES)];
      };
      const frameAlong = frameAlongOf?.(projectRoles);
      const frame = createCoordinateFrame(type, ['x'], projectRoles, {
        roleScales: { x: scale },
        ...(frameAlong !== undefined ? { frameAlong } : {}),
      });
      const gridLayers: Array<IRScope> = [];
      const axisLayers: Array<IRScope> = [];
      for (const guide of context.axisGuides) {
        const lowered = context.lowerCustomAxis(frame, guide, context.fontSize, context.provenance);
        if (lowered.gridLayer) gridLayers.push(lowered.gridLayer);
        if (lowered.axisLayer) axisLayers.push(lowered.axisLayer);
      }
      return {
        frame,
        plotArea: { x: 0, y: 0, width: context.width, height: context.height },
        gridLayers,
        axisLayers,
      };
    },
  });

/** 一维正弦坐标系 + roleScales；frameAlong 回传常量切向 [1,0]（法向恒 [0,1]，刻度短线竖直，证明被消费） */
const sineFramedTangentX = defineSineCoordinate('sineFramed', projectRoles => (_role, values) => {
  const origin = projectRoles(values);
  return origin ? { origin, tangent: [1, 0] } : null;
});

/** 同上但不回传 frameAlong → 曲线轴走数值差分回落 */
const sineNumeric = defineSineCoordinate('sineNumeric');

/** 退化坐标系：frameAlong 回传零切向 [0,0]，验证法向导出 guard 不产生 NaN */
const degenerateFramed = defineSineCoordinate(
  'degenerate',
  projectRoles => (_role, values) => {
    const origin = projectRoles(values);
    return origin ? { origin, tangent: [0, 0] } : null;
  },
  true,
);

const sineAxisSpec = (type = 'sineFramed'): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [],
    coordinate: { type },
    marks: [{ type: 'point', encoding: { x: { field: 'v' } } }],
    guides: [{ type: 'axis', dimension: 'x' }],
  });

// 轴层 = root 下含 path 子节点的 scope（point mark 层只有 node、被过滤掉）
type StepLike = { kind?: string; to?: [number, number] };
type PathLike = { type?: string; children?: Array<StepLike> };
const axisLayersOf = (root: IRScope): Array<IRScope> =>
  (root.children as ReadonlyArray<unknown>).filter(
    (child): child is IRScope =>
      (child as { type?: string; children?: Array<{ type?: string }> }).type === 'scope' &&
      ((child as { children?: Array<{ type?: string }> }).children ?? []).some(
        grandchild => grandchild.type === 'path',
      ),
  );
const pathsOf = (layer: IRScope): Array<PathLike> =>
  (layer.children as Array<PathLike>).filter(child => child.type === 'path');
const moveCount = (path: PathLike): number => (path.children ?? []).filter(step => step.kind === 'move').length;
/** 轴线 polyline（恰 1 个 move 的 path）的步数 */
const polylineStepsOf = (layer: IRScope): number =>
  pathsOf(layer).find(path => moveCount(path) === 1)?.children?.length ?? 0;
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
const labelNodesOf = (layer: IRScope): Array<IRNode> =>
  (layer.children as Array<IRNode>).filter(child => (child as { type?: string }).type === 'node');

describe('custom coordinate — frameAlong 局部标架契约（contract）', () => {
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
    const root = expandOf(sineAxisSpec('sineFramed'), { d: rows }, opts([sineFramedTangentX]));
    const axisLayer = axisLayersOf(root)[0];
    const segments = tickSegmentsOf(axisLayer);
    expect(segments.length).toBeGreaterThan(0);
    for (const [dx] of segments) expect(Math.abs(dx)).toBeLessThan(1e-6);
  });

  it('framealong_absent_falls_back_to_numeric_sampling', () => {
    // 不回传 frameAlong → 仍画弯曲轴线（polyline ≥ 4 步）；法向随正弦斜率变化、刻度短线非全竖直
    const rows = Array.from({ length: 13 }, (_unused, i) => ({ v: i }));
    const root = expandOf(sineAxisSpec('sineNumeric'), { d: rows }, opts([sineNumeric]));
    const axisLayer = axisLayersOf(root)[0];
    expect(polylineStepsOf(axisLayer)).toBeGreaterThanOrEqual(4);
    const segments = tickSegmentsOf(axisLayer);
    expect(segments.some(([dx]) => Math.abs(dx) > 1e-6)).toBe(true);
  });

  it('degenerate_tangent_guarded_no_nan', () => {
    // 零切向 [0,0] → 法向导出有 guard，标签位置仍有限（不出 NaN）
    const rows = Array.from({ length: 5 }, (_unused, i) => ({ v: i }));
    const root = expandOf(sineAxisSpec('degenerate'), { d: rows }, opts([degenerateFramed]));
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
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'bridge', archHeight: ARCH_HEIGHT },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
      guides: [{ type: 'axis', dimension: 'x' }],
    });
    const rows: Array<Record<string, number>> = [];
    for (const x of [0, 5, 10]) for (const y of [0, 10]) rows.push({ x, y });
    const root = expandOf(spec, { d: rows }, opts([bridgeCoordinate]));
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
