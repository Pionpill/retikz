import type { IRNode, IRScope } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import { ContourShapeDefinition } from '@retikz/extension';
import { describe, expect, it } from 'vitest';
import { literal, object } from 'zod';

import type { Cell, CoordinateFrame, IntervalContext, PositionScale } from '../../../src/contract';
import {
  cellGeometryAnchor,
  createCoordinateFrame,
  defineCoordinate,
  densifyCellContour,
  RETIKZ_POLAR_SEGMENT_SAMPLES,
} from '../../../src/contract';
import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import { lowerPlot } from '../../../src/pipeline/expand/lower';
import type { CartesianCoordinateFrame } from '../../../src/providers';
import { buildIntervalContext } from '../../../src/providers';
import { lowerMark as lowerMarkDefinition, MARK_REGISTRY } from '../../../src/providers';
import { createCartesianCoordinate, createPolarCoordinate } from '../../../src/providers';
import { datumAnchor as resolveDatumAnchor, resolveMarkOperation } from '../../../src/resolve/mark';
import type { IRPlot, IRPlotIntervalMark } from '../../../src/schemas';
import { PlotSchema, PolarInterpolation } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

/**
 * 区间几何投影契约测试——frame.projectCell 统一 interval / sector / 曲线轴下沉。
 * 验证 cartesian/polar 闭式快路逐字段等价、CellGeometry 三态装配、densifyCellContour 密采样闭合、
 * contour Node 可连接、datumAnchor 三态 parity，以及无 projectCell 坐标系 fail-loud
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

const markRegistry = MARK_REGISTRY;

const lowerMark = (mark: IRPlotIntervalMark, rows: Array<ExternalRow>, frame: CoordinateFrame) =>
  lowerMarkDefinition(resolveMarkOperation(mark, { registry: markRegistry }), { kind: 'rows', rows }, frame);

const datumAnchor = (mark: IRPlotIntervalMark, row: ExternalRow, frame: CoordinateFrame, context?: IntervalContext) =>
  resolveDatumAnchor(mark, { kind: 'row', row, transformedIndex: 0 }, frame, { registry: markRegistry }, context);

const expandOf = (spec: IRPlot, datasets: Datasets, options: LowerPlotsOptions): IRScope => {
  return lowerPlot(spec, datasets, { ...options, textMeasurer: measureLabel }) as IRScope;
};

const firstLayer = (spec: IRPlot, datasets: Datasets, options: LowerPlotsOptions): IRScope =>
  expandOf(spec, datasets, options).children[0] as IRScope;

/** 深度收集图层内所有 node（无 color → 直接子；有 color → 藏在分色子 Scope 里） */
const nodesOf = (layer: IRScope): Array<IRNode> => {
  const out: Array<IRNode> = [];

  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'node') out.push(child as IRNode);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };

  walk(layer.children);

  return out;
};

const nodeWidth = (node: IRNode): number => {
  const size = node.layout?.minimumSize;
  if (typeof size === 'number') return size;
  return size?.width ?? size?.default ?? 0;
};

const nodeHeight = (node: IRNode): number => {
  const size = node.layout?.minimumSize;
  if (typeof size === 'number') return size;
  return size?.height ?? size?.default ?? 0;
};

/** 简易线性 PositionScale 桩（domain → range 线性映射，bandwidth 固定）；只用于本文件单元断言 */
const linearStub = (domain: [number, number], range: [number, number], bandwidth = 0): PositionScale => {
  const [d0, d1] = domain;
  const [r0, r1] = range;

  return {
    coordinate: (value: unknown) =>
      typeof value === 'number' && Number.isFinite(value) ? r0 + ((value - d0) / (d1 - d0)) * (r1 - r0) : NaN,
    domain: () => [d0, d1],
    get bandwidth() {
      return bandwidth;
    },
    get step() {
      return bandwidth;
    },
    ticks: () => ({ ticks: [], labels: [] }) as unknown as ReturnType<PositionScale['ticks']>,
    range: () => [r0, r1],
    setRange: () => undefined,
  };
};

const squarePolarFrame = (interpolation: 'polar' | 'chord', step = 90, startAngle = 0, endAngle = 360) =>
  createPolarCoordinate({
    center: [0, 0],
    innerRadius: 0,
    outerRadius: 100,
    startAngle,
    endAngle,
    interpolation,
    angularSkeleton: startAngle <= endAngle ? [45, 135, 225, 315] : [315, 225, 135, 45],
    primary: linearStub([0, 1], [startAngle, endAngle], step),
    secondary: linearStub([0, 1], [0, 100]),
  });

describe('极坐标映射角色投影', () => {
  it('将离散弦角投影到其相邻的多边形边上', () => {
    const frame = squarePolarFrame(PolarInterpolation.Chord);
    const start = frame.projectPolar(45, 100);
    const end = frame.projectPolar(135, 100);

    expect(start).not.toBeNull();
    expect(end).not.toBeNull();
    expect(frame.projectMappedRoles([67.5, 100])).toEqual([
      (start?.[0] ?? 0) * 0.75 + (end?.[0] ?? 0) * 0.25,
      (start?.[1] ?? 0) * 0.75 + (end?.[1] ?? 0) * 0.25,
    ]);
  });

  it('在圆形投影上保持极弦角和连续弦角', () => {
    const expected = squarePolarFrame(PolarInterpolation.Polar).projectPolar(67.5, 100);

    expect(squarePolarFrame(PolarInterpolation.Polar).projectMappedRoles([67.5, 100])).toEqual(expected);
    expect(squarePolarFrame(PolarInterpolation.Chord, 0).projectMappedRoles([67.5, 100])).toEqual(expected);
  });

  it('在正向和反向扫描中插入循环接缝', () => {
    const expected = [Math.SQRT1_2 * 100, -Math.SQRT1_2 * 50];

    const forward = squarePolarFrame(PolarInterpolation.Chord).projectMappedRoles([337.5, 100]);
    const reversed = squarePolarFrame(PolarInterpolation.Chord, 90, 360, 0).projectMappedRoles([337.5, 100]);

    expect(forward?.[0]).toBeCloseTo(expected[0], 6);
    expect(forward?.[1]).toBeCloseTo(expected[1], 6);
    expect(reversed?.[0]).toBeCloseTo(expected[0], 6);
    expect(reversed?.[1]).toBeCloseTo(expected[1], 6);
  });

  it('使用弦长和多边形边缘深度转换字形范围', () => {
    const frame = squarePolarFrame(PolarInterpolation.Chord);

    expect(frame.placementBoundary.glyphExtentInRoleUnits('x', [67.5, 100], 10)).toBeCloseTo(
      10 / ((Math.SQRT2 * 100) / 90),
      6,
    );
    expect(frame.placementBoundary.glyphExtentInRoleUnits('y', [67.5, 100], 10)).toBeCloseTo(10 / Math.SQRT1_2, 6);
  });
});

// ── projectCell 闭式快路：cartesian → rect、polar → sector ──────────────────────────────
describe('projectCell 闭式快路（rect / sector）', () => {
  it('笛卡尔投影单元返回矩形', () => {
    const frame = createCartesianCoordinate(linearStub([0, 10], [0, 100], 20), linearStub([0, 10], [200, 0]));

    // primary 像素带 [40,60]、secondary 像素 [200,120] → rect 中心 [50,160]、width 20、height 80
    const cell: Cell = { intervals: { x: [40, 60], y: [200, 120] } };
    const geometry = frame.projectCell(cell);

    expect(geometry).toEqual({ kind: 'rect', position: [50, 160], width: 20, height: 80 });
  });

  it('极坐标 projectCell 返回扇区', () => {
    const frame = createPolarCoordinate({
      center: [200, 200],
      innerRadius: 0,
      outerRadius: 150,
      startAngle: 0,
      endAngle: 360,
      interpolation: PolarInterpolation.Polar,
      angularSkeleton: [0, 90, 180, 270],
      primary: linearStub([0, 1], [0, 360]),
      secondary: linearStub([0, 1], [0, 150]),
    });
    const cell: Cell = { intervals: { x: [30, 90], y: [40, 120] } };
    const geometry = frame.projectCell(cell);

    expect(geometry).toEqual({
      kind: 'sector',
      center: [200, 200],
      innerRadius: 40,
      outerRadius: 120,
      startAngle: 30,
      endAngle: 90,
    });
  });

  it('极坐标 projectCell 的 chord 插值为部分单元格返回直线轮廓', () => {
    const frame = createPolarCoordinate({
      center: [0, 0],
      innerRadius: 0,
      outerRadius: 100,
      startAngle: 0,
      endAngle: 360,
      interpolation: PolarInterpolation.Chord,
      angularSkeleton: [0, 90, 180, 270],
      primary: linearStub([0, 1], [0, 360]),
      secondary: linearStub([0, 1], [0, 100]),
    });

    const geometry = frame.projectCell({ intervals: { x: [0, 90], y: [40, 100] } });

    expect(geometry.kind).toBe('contour');

    if (geometry.kind !== 'contour') return;

    expect(geometry.points).toHaveLength(4);

    const expected = [
      [40, 0],
      [0, 40],
      [0, 100],
      [100, 0],
    ];

    for (let index = 0; index < expected.length; index += 1) {
      expect(geometry.points[index][0]).toBeCloseTo(expected[index][0], 9);
      expect(geometry.points[index][1]).toBeCloseTo(expected[index][1], 9);
    }
  });

  it('内半径为零时部分单元格的 chord 插值仅使用一次圆心', () => {
    const frame = createPolarCoordinate({
      center: [0, 0],
      innerRadius: 0,
      outerRadius: 100,
      startAngle: 0,
      endAngle: 360,
      interpolation: PolarInterpolation.Chord,
      angularSkeleton: [0, 90, 180, 270],
      primary: linearStub([0, 1], [0, 360]),
      secondary: linearStub([0, 1], [0, 100]),
    });
    const geometry = frame.projectCell({ intervals: { x: [0, 90], y: [0, 100] } });

    expect(geometry.kind).toBe('contour');

    if (geometry.kind !== 'contour') return;

    expect(geometry.points).toHaveLength(3);
    expect(geometry.points.filter(point => point[0] === 0 && point[1] === 0)).toHaveLength(1);
  });

  it('整圈扫掠时极坐标 projectCell 的 chord 插值使用结构骨架', () => {
    const frame = createPolarCoordinate({
      center: [0, 0],
      innerRadius: 0,
      outerRadius: 100,
      startAngle: 0,
      endAngle: 360,
      interpolation: PolarInterpolation.Chord,
      angularSkeleton: [0, 90, 180, 270],
      primary: linearStub([0, 1], [0, 360]),
      secondary: linearStub([0, 1], [0, 100]),
    });
    const geometry = frame.projectCell({ intervals: { x: [0, 360], y: [40, 100] } });

    expect(geometry.kind).toBe('contour');

    if (geometry.kind !== 'contour') return;

    expect(geometry.points).toHaveLength(8);
    expect(new Set(geometry.points.map(point => point.map(value => value.toFixed(6)).join(','))).size).toBe(8);
  });

  it('内半径为零时极坐标 projectCell 的 chord 插值仅返回外多边形', () => {
    const frame = createPolarCoordinate({
      center: [0, 0],
      innerRadius: 0,
      outerRadius: 100,
      startAngle: 0,
      endAngle: 360,
      interpolation: PolarInterpolation.Chord,
      angularSkeleton: [0, 90, 180, 270],
      primary: linearStub([0, 1], [0, 360]),
      secondary: linearStub([0, 1], [0, 100]),
    });
    const geometry = frame.projectCell({ intervals: { x: [0, 360], y: [0, 100] } });

    expect(geometry.kind).toBe('contour');

    if (geometry.kind !== 'contour') return;

    expect(geometry.points).toHaveLength(4);
    expect(geometry.points.every(point => Math.hypot(point[0], point[1]) === 100)).toBe(true);
  });

  it('整圈扫掠不足三个方向时极坐标 projectCell 的 chord 插值跳过输出', () => {
    const frame = createPolarCoordinate({
      center: [0, 0],
      innerRadius: 0,
      outerRadius: 100,
      startAngle: 0,
      endAngle: 360,
      interpolation: PolarInterpolation.Chord,
      angularSkeleton: [0, 180],
      primary: linearStub([0, 1], [0, 360]),
      secondary: linearStub([0, 1], [0, 100]),
    });

    expect(frame.projectCell({ intervals: { x: [0, 360], y: [40, 100] } })).toEqual({
      kind: 'contour',
      points: [],
    });
  });
});

// ── cartesian / polar interval / sector 经 lowerPlots 的产物基线（byte-equal 回归网）─────────
const WIDTH = 400;

const HEIGHT = 400;

const cartOpts: LowerPlotsOptions = { layout: { width: WIDTH, height: HEIGHT } };

const cartesianBarSpec = (arrangement?: 'stack', series?: string): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    coordinate: { type: 'cartesian2D', x: 'cat', y: 'val' },
    scales: [
      { type: 'band', name: 'cat' },
      { type: 'linear', name: 'val' },
    ],
    marks: [
      {
        type: 'interval',
        encodings: {
          position: { x: { field: 'm' }, y: { field: 'v' } },
          ...(series ? { series } : {}),
          bounds: {
            ...(series ? { x: { group: series } } : {}),
            ...(arrangement === 'stack' ? { y: { from: 'y0', to: 'y1' } } : {}),
          },
        },
        properties: {
          bounds: {
            ...(series ? { x: { kind: 'band' } } : {}),
            ...(arrangement === 'stack' ? { y: { kind: 'extent' } } : {}),
          },
        },
      },
    ],
  });

describe('cartesian interval → rect 产物（byte-equal 回归基线）', () => {
  it('笛卡尔 interval 生成普通矩形节点', () => {
    const rows = [
      { m: 'A', v: 3 },
      { m: 'B', v: 6 },
      { m: 'C', v: 9 },
    ];
    const nodes = nodesOf(firstLayer(cartesianBarSpec(), { d: rows }, cartOpts));

    expect(nodes).toHaveLength(3);

    for (const node of nodes) {
      expect(node.type).toBe('node');
      expect(typeof nodeWidth(node)).toBe('number');
      expect(typeof nodeHeight(node)).toBe('number');

      // 矩形柱无 shape ref（barStyle 在 nodeDefault 给 rectangle）；position 为 [x, y]
      expect(node.shape).toBeUndefined();
      expect(Array.isArray(node.position)).toBe(true);
    }

    // 柱宽相等（同 bandwidth）、柱高随 value 单调
    expect(nodeWidth(nodes[0])).toBeCloseTo(nodeWidth(nodes[1]), 9);
    expect(nodeHeight(nodes[2]) > nodeHeight(nodes[0])).toBe(true);
  });

  it('笛卡尔 interval 的 dodge 使用矩形子宽度', () => {
    const rows = [
      { m: 'A', v: 3, s: 'x' },
      { m: 'A', v: 5, s: 'y' },
      { m: 'B', v: 6, s: 'x' },
      { m: 'B', v: 2, s: 'y' },
    ];
    const nodes = nodesOf(firstLayer(cartesianBarSpec(undefined, 's'), { d: rows }, cartOpts));

    expect(nodes).toHaveLength(4);

    // dodge：子带宽 = bandwidth / 2 < plain bandwidth
    const plain = nodesOf(firstLayer(cartesianBarSpec(), { d: rows }, cartOpts));

    expect(nodeWidth(nodes[0]) < nodeWidth(plain[0])).toBe(true);
  });

  it('笛卡尔 interval 可编译为 Scene', () => {
    const rows = [
      { m: 'A', v: 3 },
      { m: 'B', v: 6 },
    ];
    const layer = firstLayer(cartesianBarSpec(), { d: rows }, cartOpts);

    expect(() => compileToScene({ version: 1, type: 'scene', children: [layer] }).scene).not.toThrow();
  });
});

const polarBarSpec = (interpolation?: 'polar' | 'chord', markInterpolation?: 'polar' | 'chord'): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    coordinate: { type: 'polar2D', angle: 'cat', radius: 'val', ...(interpolation ? { interpolation } : {}) },
    scales: [
      { type: 'band', name: 'cat' },
      { type: 'linear', name: 'val' },
    ],
    marks: [
      {
        type: 'interval',
        ...(markInterpolation ? { properties: { interpolation: markInterpolation } } : {}),
        encodings: { position: { x: { field: 'm' }, y: { field: 'v' } } },
      },
    ],
  });

const pieSpec = (): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    transform: [{ operation: { kind: 'stack', params: { y: 'value' } } }],
    coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
    scales: [
      { type: 'linear', name: 'a' },
      { type: 'linear', name: 'r' },
    ],
    marks: [
      {
        type: 'interval',
        encodings: { bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } }, color: 'label' },
        properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
      },
    ],
  });

describe('polar interval / sector → sector 产物（byte-equal 回归基线）', () => {
  it('极坐标 interval 生成扇区节点', () => {
    const rows = [
      { m: 'A', v: 3 },
      { m: 'B', v: 6 },
      { m: 'C', v: 9 },
    ];
    const nodes = nodesOf(firstLayer(polarBarSpec('polar'), { d: rows }, cartOpts));

    expect(nodes).toHaveLength(3);

    for (const node of nodes) {
      const shape = node.shape as { type?: string; params?: Record<string, number> } | undefined;

      expect(shape?.type).toBe('sector');
      expect(shape!.params!.outerRadius).toBeGreaterThanOrEqual(shape!.params!.innerRadius);
    }
  });

  it('离散极坐标 interval 默认使用轮廓节点', () => {
    const rows = [
      { m: 'A', v: 3 },
      { m: 'B', v: 6 },
      { m: 'C', v: 9 },
    ];
    const nodes = nodesOf(firstLayer(polarBarSpec(), { d: rows }, cartOpts));

    expect(nodes).toHaveLength(3);
    expect(nodes.every(node => (node.shape as { type?: string } | undefined)?.type === 'contour')).toBe(true);
  });

  it('极坐标 interval 的标记插值覆盖优先于坐标配置', () => {
    const rows = [
      { m: 'A', v: 3 },
      { m: 'B', v: 6 },
      { m: 'C', v: 9 },
    ];
    const polarNodes = nodesOf(firstLayer(polarBarSpec('chord', 'polar'), { d: rows }, cartOpts));
    const chordNodes = nodesOf(firstLayer(polarBarSpec('polar', 'chord'), { d: rows }, cartOpts));

    expect(polarNodes.every(node => (node.shape as { type?: string } | undefined)?.type === 'sector')).toBe(true);
    expect(chordNodes.every(node => (node.shape as { type?: string } | undefined)?.type === 'contour')).toBe(true);
  });

  it('笛卡尔 interval 拒绝 polar 插值覆盖', () => {
    const spec = PlotSchema.parse({
      ...cartesianBarSpec(),
      marks: [
        {
          type: 'interval',
          encodings: { position: { x: { field: 'm' }, y: { field: 'v' } } },
          properties: { interpolation: 'chord' },
        },
      ],
    });

    expect(() => firstLayer(spec, { d: [{ m: 'A', v: 3 }] }, cartOpts)).toThrow(/interpolation|polar2D/i);
  });

  it('饼图扇形标记节点', () => {
    const rows = [
      { label: 'A', value: 3 },
      { label: 'B', value: 5 },
      { label: 'C', value: 2 },
    ];
    const nodes = nodesOf(firstLayer(pieSpec(), { d: rows }, cartOpts));

    expect(nodes).toHaveLength(3);

    for (const node of nodes) {
      const shape = node.shape as { type?: string } | undefined;

      expect(shape?.type).toBe('sector');
    }
  });
});

// ── densifyCellContour + 测试专用曲线 frame：interval 走 contour ────────────────────────
/** 测试专用曲线 frame：cartesian 帧（cell 计算同 cartesian），projectCell 改返回 contour（上沿弯成抛物） */
const curvedFrame = (): CartesianCoordinateFrame => {
  const base = createCartesianCoordinate(linearStub([0, 10], [0, 200], 40), linearStub([0, 10], [200, 0]));

  // 输出空间 (px, py) → 屏幕：x 原样、y 加一段随 px 变化的弯曲（使顶 / 底边非直线 → 必须密采样）
  const projectFn = (px: number, py: number): [number, number] => [px, py + 20 * Math.sin((px / 200) * Math.PI)];

  return {
    ...base,
    projectCell: cell => ({
      kind: 'contour',
      points: densifyCellContour(cell, projectFn, { curvedPrimary: true, curvedSecondary: false }),
    }),
  };
};

const intervalMarkSpec = (): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    coordinate: { type: 'cartesian2D', x: 'cat', y: 'val' },
    scales: [
      { type: 'band', name: 'cat' },
      { type: 'linear', name: 'val' },
    ],
    marks: [{ type: 'interval', encodings: { position: { x: { field: 'm' }, y: { field: 'v' } } } }],
  });

/** 取首个 interval mark（窄化为 IRPlotIntervalMark，供需 IRPlotIntervalMark 的 buildIntervalContext 用） */
const firstIntervalMark = (spec: IRPlot): IRPlotIntervalMark => {
  const mark = spec.marks[0];
  if (mark.type !== 'interval') throw new Error('expected interval mark');
  return mark;
};

describe('densifyCellContour + 曲线 frame → contour 全链路', () => {
  it('单元格轮廓加密后保持密集且闭合', () => {
    const cell: Cell = { intervals: { x: [0, 200], y: [200, 100] } };
    const projectFn = (px: number, py: number): [number, number] => [px, py + 20 * Math.sin((px / 200) * Math.PI)];
    const points = densifyCellContour(cell, projectFn, { curvedPrimary: true, curvedSecondary: false });

    // 曲边两条各 N+1 段、直边两条各 1 段 → 2·(N+1) + 2·1 顶点（每边产「终点 + 中间点」、不含起点）
    expect(points.length).toBe(2 * (RETIKZ_POLAR_SEGMENT_SAMPLES + 1) + 2);

    // 闭合：末点 → 首点为左边终段，环绕回起点 [0,200]
    expect(points[points.length - 1]).toEqual([0, 200]);

    // 顶 / 底边确实弯曲（中段点 y 偏离直线连接）
    const mid = points[Math.floor((RETIKZ_POLAR_SEGMENT_SAMPLES + 1) / 2)];

    expect(Math.abs(mid[1] - 200)).toBeGreaterThan(1e-6);
  });

  it('自定义 interval 缺少 roleScales 时明确报错', () => {
    // 注册 frame 即便带 projectCell，缺少 roleScales 时也无法从 encoding/bounds 构造 cell →
    //   fail-loud，不静默产空层（守「无 cell 构造即 fail-loud、无引擎自动兜底」）
    const custom = createCoordinateFrame('curved-cell', ['x', 'y'], values => [Number(values[0]), Number(values[1])], {
      projectCell: (cell: Cell) => ({
        kind: 'contour',
        points: densifyCellContour(cell, (p, s) => [p, s], { curvedPrimary: false, curvedSecondary: false }),
      }),
    });
    const mark = firstIntervalMark(intervalMarkSpec());

    expect(() => lowerMark(mark, [{ m: 2, v: 3 }], custom)).toThrow(/not supported|interval|custom/i);
  });

  it('曲线坐标框架的 interval 下沉为轮廓节点', () => {
    const mark = firstIntervalMark(intervalMarkSpec());
    const rows = [
      { m: 2, v: 3 },
      { m: 6, v: 6 },
    ];
    const frame = curvedFrame();
    const layer = lowerMark(mark, rows, frame) as IRScope;
    const nodes = nodesOf(layer);

    expect(nodes).toHaveLength(2);

    for (const node of nodes) {
      const shape = node.shape as { type?: string; params?: { points?: Array<[number, number]> } } | undefined;

      expect(shape?.type).toBe('contour');

      // 顶点密采样（曲边）+ 闭合环 ≥ 4 顶点
      expect(shape!.params!.points?.length ?? 0).toBeGreaterThanOrEqual(4);
    }
  });

  it('轮廓位置为各点 AABB 的中心', () => {
    const mark = firstIntervalMark(intervalMarkSpec());
    const rows = [{ m: 4, v: 3 }];
    const layer = lowerMark(mark, rows, curvedFrame()) as IRScope;
    const node = nodesOf(layer)[0];
    const points = (node.shape as unknown as { params: { points: Array<[number, number]> } }).params.points;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const [x, y] of points) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    const position = node.position as [number, number];

    expect(position[0]).toBeCloseTo((minX + maxX) / 2, 9);
    expect(position[1]).toBeCloseTo((minY + maxY) / 2, 9);
  });

  it('轮廓 interval 节点可连接', () => {
    // 另一 core Path 自动 clip 到 contour interval Node 边界（boundaryPoint 指向式）→ compile 不抛、解析出轮廓交点
    const mark = firstIntervalMark(intervalMarkSpec());
    const rows = [{ m: 4, v: 3 }];
    const layer = lowerMark(mark, rows, curvedFrame()) as IRScope;
    const node: IRNode = { ...nodesOf(layer)[0], id: 'bar0' };
    const start: [number, number] = [-200, -200];
    const scene = {
      version: 1 as const,
      type: 'scene' as const,
      children: [
        {
          type: 'scope' as const,
          children: [node],
          defaults: {
            node: {
              style: { strokeWidth: 0 },
              layout: { padding: 0 },
            },
          },
        },
        {
          type: 'path' as const,
          children: [
            { type: 'step' as const, kind: 'move' as const, to: start },
            { type: 'step' as const, kind: 'line' as const, to: { id: 'bar0' } },
          ],
        },
      ],
    };
    const compiled = compileToScene(scene, { shapes: [ContourShapeDefinition] }).scene;

    expect(compiled).toBeTruthy();
  });
});

// ── datumAnchor 三态 parity（locator 与 lowering 摆放同源）──────────────────────────────
describe('datumAnchor 三态与 CellGeometry 同源', () => {
  it('矩形锚点与位置一致', () => {
    const geometry = { kind: 'rect' as const, position: [50, 160] as [number, number], width: 20, height: 80 };

    expect(cellGeometryAnchor(geometry)).toEqual([50, 160]);
  });

  it('锚点扇区是质心', () => {
    // mid-angle 90°、mid-radius 80 → [center + 80·cos90, center + 80·sin90] = [200, 280]
    const geometry = {
      kind: 'sector' as const,
      center: [200, 200] as [number, number],
      innerRadius: 60,
      outerRadius: 100,
      startAngle: 60,
      endAngle: 120,
    };
    const anchor = cellGeometryAnchor(geometry);

    expect(anchor).not.toBeNull();
    expect(anchor![0]).toBeCloseTo(200, 6);
    expect(anchor![1]).toBeCloseTo(280, 6);
  });

  it('锚轮廓为 aabb 中心', () => {
    const geometry = {
      kind: 'contour' as const,
      points: [
        [0, 0],
        [10, 0],
        [10, 20],
        [0, 20],
      ] as Array<[number, number]>,
    };

    expect(cellGeometryAnchor(geometry)).toEqual([5, 10]);
  });

  it('点太少的锚轮廓为空', () => {
    const geometry = {
      kind: 'contour' as const,
      points: [
        [0, 0],
        [10, 0],
      ] as Array<[number, number]>,
    };

    expect(cellGeometryAnchor(geometry)).toBeNull();
  });

  it('基准锚点笛卡尔间隔与节点位置匹配', () => {
    // datumAnchor（locator）= lowerMark 摆放的柱 Node.position（同一 frame、同源不漂移）
    const mark = firstIntervalMark(intervalMarkSpec());
    const rows = [
      { m: 2, v: 3 },
      { m: 6, v: 6 },
    ];
    const frame = createCartesianCoordinate(linearStub([0, 10], [0, 200], 40), linearStub([0, 10], [200, 0]));
    const ctx = buildIntervalContext(mark, frame, rows);
    const nodes = nodesOf(lowerMark(mark, rows, frame) as IRScope);
    rows.forEach((row, index) => {
      const anchor = datumAnchor(mark, row, frame, ctx);
      const position = nodes[index].position as [number, number];

      expect(anchor).not.toBeNull();
      expect(anchor![0]).toBeCloseTo(position[0], 9);
      expect(anchor![1]).toBeCloseTo(position[1], 9);
    });
  });

  it('基准锚弯曲区间为轮廓 aabb 中心', () => {
    // 曲线 frame：datumAnchor 走 markCell → projectCell(contour) → AABB 中心，与 lowered Node.position 同源
    const mark = firstIntervalMark(intervalMarkSpec());
    const rows = [{ m: 4, v: 3 }];
    const frame = curvedFrame();
    const ctx = buildIntervalContext(mark, frame, rows);
    const anchor = datumAnchor(mark, rows[0], frame, ctx);
    const node = nodesOf(lowerMark(mark, rows, frame) as IRScope)[0];
    const position = node.position as [number, number];

    expect(anchor).not.toBeNull();
    expect(anchor![0]).toBeCloseTo(position[0], 9);
    expect(anchor![1]).toBeCloseTo(position[1], 9);
  });
});

// ── contract：histogram 连续 x 区间柱（interval x0Field / x1Field）──────────────────
describe('interval x0Field / x1Field → 连续 x 区间柱（histogram）', () => {
  const histogramMark = (): IRPlotIntervalMark => ({
    type: 'interval',
    encodings: {
      bounds: { x: { from: { field: 'binStart' }, to: { field: 'binEnd' } } },
      position: { y: { field: 'binCount' } },
    },
    properties: { bounds: { x: { kind: 'extent' } } },
  });

  it('x0x1 主要是连续间隔而不是带状', () => {
    // 连续 x scale（bandwidth 0）：primary cell = [coord(binStart), coord(binEnd)]、紧贴排列、宽随箱边
    const mark = histogramMark();
    const rows = [
      { binStart: 0, binEnd: 2, binCount: 5 },
      { binStart: 2, binEnd: 4, binCount: 3 },
    ];
    const frame = createCartesianCoordinate(linearStub([0, 10], [0, 200], 0), linearStub([0, 10], [200, 0]));
    const nodes = nodesOf(lowerMark(mark, rows, frame) as IRScope);

    expect(nodes).toHaveLength(2);

    // coord(0)=0, coord(2)=40, coord(4)=80 → 宽 40 各；中心 20 / 60；紧贴（node0 右 = node1 左）
    expect(nodeWidth(nodes[0])).toBeCloseTo(40, 9);
    expect(nodeWidth(nodes[1])).toBeCloseTo(40, 9);
    expect((nodes[0].position as [number, number])[0]).toBeCloseTo(20, 9);
    expect((nodes[1].position as [number, number])[0]).toBeCloseTo(60, 9);

    // secondary 高度 = coord(0)..coord(binCount)：bar0 = |200-100|=100、bar1 = |200-140|=60
    expect(nodeHeight(nodes[0])).toBeCloseTo(100, 9);
    expect(nodeHeight(nodes[1])).toBeCloseTo(60, 9);
  });

  it('x0x1 不等宽的 bin 跟随边缘', () => {
    // 不等宽箱（thresholds 派生）：宽随各自箱边
    const mark = histogramMark();
    const rows = [
      { binStart: 0, binEnd: 1, binCount: 2 },
      { binStart: 1, binEnd: 5, binCount: 4 },
    ];
    const frame = createCartesianCoordinate(linearStub([0, 10], [0, 200], 0), linearStub([0, 10], [200, 0]));
    const nodes = nodesOf(lowerMark(mark, rows, frame) as IRScope);

    // coord(1)-coord(0)=20、coord(5)-coord(1)=80
    expect(nodeWidth(nodes[0])).toBeCloseTo(20, 9);
    expect(nodeWidth(nodes[1])).toBeCloseTo(80, 9);
  });

  it('x0x1 直方图端到端渲染连续条', () => {
    // 经 lowerPlots：bin transform + interval x0/x1（连续 x linear scale）→ 紧贴直方柱，可 compile
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      transform: [{ operation: { kind: 'bin', params: { field: 'm', step: 2 } } }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      marks: [
        {
          type: 'interval',
          encodings: {
            bounds: { x: { from: { field: 'binStart' }, to: { field: 'binEnd' } } },
            position: { y: { field: 'binCount' } },
          },
          properties: { bounds: { x: { kind: 'extent' } } },
        },
      ],
    });
    const rows = [{ m: 0 }, { m: 1 }, { m: 3 }, { m: 5 }];
    const layer = firstLayer(spec, { d: rows }, cartOpts);
    const nodes = nodesOf(layer);

    // step 2、域 [0,5] → 箱 [0,2),[2,4),[4,6] → 3 箱（含空箱可能）；至少有柱、且可编译
    expect(nodes.length).toBeGreaterThanOrEqual(1);
    expect(() => compileToScene({ version: 1, type: 'scene', children: [layer] }).scene).not.toThrow();
  });
});

// ── fail-loud：无 projectCell 的坐标系 / 不支持的 cell bound ──────────────────────────────
describe('cell 类 mark 在无 projectCell 坐标系 fail-loud', () => {
  it('一维 interval 明确报错', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      coordinate: { type: 'cartesian1D', x: 'cat' },
      scales: [{ type: 'band', name: 'cat' }],
      marks: [{ type: 'interval', encodings: { position: { x: { field: 'm' }, y: { field: 'v' } } } }],
    });

    expect(() => expandOf(spec, { d: [{ m: 'A', v: 3 }] }, cartOpts)).toThrow(/cartesian1D|not supported|interval/i);
  });

  it('没有项目单元的自定义间隔明确报错', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'noproj' },
      marks: [{ type: 'interval', encodings: { position: { x: { field: 'm' }, y: { field: 'v' } } } }],
    });

    // custom 工厂返回无 projectCell 的 frame → interval fail-loud（指明缺 projectCell）
    const options: LowerPlotsOptions = {
      layout: { width: WIDTH, height: HEIGHT },
      definitions: {
        coordinates: [
          defineCoordinate({
            schema: object({
              type: literal('noproj').describe('Discriminator: no-project-cell custom coordinate operation'),
            }),
            roles: ['x', 'y'],
            resolve: (_operation, ctx) => {
              const xValues = ctx.collectRoleValues('x');
              const yValues = ctx.collectRoleValues('y');
              const xScale = ctx.buildPositionScale(ctx.resolveScaleForRole('x', undefined, xValues), xValues, [
                0,
                ctx.width,
              ]);
              const yScale = ctx.buildPositionScale(ctx.resolveScaleForRole('y', undefined, yValues), yValues, [
                ctx.height,
                0,
              ]);

              return {
                frame: createCoordinateFrame('noproj', ['x', 'y'], values => {
                  const x = xScale.coordinate(values[0]);
                  const y = yScale.coordinate(values[1]);
                  return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
                }),
                plotArea: { x: 0, y: 0, width: ctx.width, height: ctx.height },
                gridLayers: [],
                axisLayers: [],
              };
            },
          }),
        ],
      },
    };

    expect(() => expandOf(spec, { d: [{ m: 1, v: 3 }] }, options)).toThrow(/noproj|projectCell|not supported/i);
  });

  it('使用投影单元下沉轮廓的间隔自定义', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'curved-cell' },
      marks: [{ type: 'interval', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } }],
    });
    const options: LowerPlotsOptions = {
      layout: { width: WIDTH, height: HEIGHT },
      definitions: {
        coordinates: [
          defineCoordinate({
            schema: object({
              type: literal('curved-cell').describe('Discriminator: project-cell custom coordinate operation'),
            }),
            roles: ['x', 'y'],
            resolve: (_operation, ctx) => {
              const xValues = ctx.collectRoleValues('x');
              const yValues = ctx.collectRoleValues('y');
              const xScale = ctx.buildPositionScale(ctx.resolveScaleForRole('x', undefined, xValues), xValues, [
                0,
                ctx.width,
              ]);
              const yScale = ctx.buildPositionScale(ctx.resolveScaleForRole('y', undefined, yValues), yValues, [
                ctx.height,
                0,
              ]);

              const projectRoles = (values: ReadonlyArray<unknown>): [number, number] | null => {
                const x = xScale.coordinate(values[0]);
                const y = yScale.coordinate(values[1]);

                return Number.isFinite(x) && Number.isFinite(y)
                  ? [x, y + 16 * Math.sin((x / ctx.width) * Math.PI)]
                  : null;
              };

              return {
                frame: createCoordinateFrame('curved-cell', ['x', 'y'], projectRoles, {
                  roleScales: { x: xScale, y: yScale },
                  projectCell: cell => ({
                    kind: 'contour',
                    points: densifyCellContour(cell, (x, y) => [x, y + 16 * Math.sin((x / ctx.width) * Math.PI)], {
                      curvedPrimary: true,
                    }),
                  }),
                }),
                plotArea: { x: 0, y: 0, width: ctx.width, height: ctx.height },
                gridLayers: [],
                axisLayers: [],
              };
            },
          }),
        ],
      },
    };
    const layer = firstLayer(spec, { d: [{ x: 3, y: 4 }] }, options);
    const node = nodesOf(layer)[0];
    const shape = node.shape as { type?: string; params?: { points?: Array<[number, number]> } } | undefined;

    expect(shape?.type).toBe('contour');
    expect(shape?.params?.points?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it('自定义分组 band 的 interval 使用子分带', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'curved-cell' },
      marks: [
        {
          type: 'interval',
          encodings: {
            series: 'series',
            bounds: { x: { group: 'series' } },
            position: { x: { field: 'x' }, y: { field: 'y' } },
          },
          properties: { bounds: { x: { kind: 'band' } } },
        },
      ],
    });
    const options: LowerPlotsOptions = {
      layout: { width: WIDTH, height: HEIGHT },
      definitions: {
        coordinates: [
          defineCoordinate({
            schema: object({
              type: literal('curved-cell').describe('Discriminator: project-cell custom coordinate operation'),
            }),
            roles: ['x', 'y'],
            resolve: (_operation, ctx) => {
              const xValues = ctx.collectRoleValues('x');
              const yValues = ctx.collectRoleValues('y');
              const xScale = ctx.buildPositionScale(ctx.resolveScaleForRole('x', undefined, xValues), xValues, [
                0,
                ctx.width,
              ]);
              const yScale = ctx.buildPositionScale(ctx.resolveScaleForRole('y', undefined, yValues), yValues, [
                ctx.height,
                0,
              ]);

              const projectRoles = (values: ReadonlyArray<unknown>): [number, number] | null => {
                const x = xScale.coordinate(values[0]);
                const y = yScale.coordinate(values[1]);
                return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
              };

              return {
                frame: createCoordinateFrame('curved-cell', ['x', 'y'], projectRoles, {
                  roleScales: { x: xScale, y: yScale },
                  projectCell: cell => ({ kind: 'contour', points: densifyCellContour(cell, (x, y) => [x, y]) }),
                }),
                plotArea: { x: 0, y: 0, width: ctx.width, height: ctx.height },
                gridLayers: [],
                axisLayers: [],
              };
            },
          }),
        ],
      },
    };
    const rows = [
      { x: 'A', y: 4, series: 'left' },
      { x: 'A', y: 6, series: 'right' },
    ];
    const layer = firstLayer(spec, { d: rows }, options);
    const nodes = nodesOf(layer);

    expect(nodes).toHaveLength(2);

    const left = nodes[0].position as [number, number];
    const right = nodes[1].position as [number, number];

    expect(left[0]).toBeLessThan(right[0]);
  });
});
