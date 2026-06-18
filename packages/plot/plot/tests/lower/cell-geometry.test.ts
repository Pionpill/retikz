import type { IRNode, IRScope } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type IntervalMark, type Mark, type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/pipeline/expand';
import { buildIntervalContext, cellGeometryAnchor, datumAnchor } from '../../src/mark/anchor';
import { lowerMark } from '../../src/mark/mark';
import {
  type CartesianFrame,
  type Cell,
  RETIKZ_POLAR_SEGMENT_SAMPLES,
  createCartesianFrame,
  createCustomFrame,
  createPolarFrame,
  densifyCellContour,
} from '../../src/coordinate/project';
import type { PositionScale } from '../../src/scale/scale';

/**
 * ADR-01（alpha.11）：区间几何投影契约测试——frame.projectCell 统一 interval / sector / 曲线轴下沉。
 * 验证 cartesian/polar 闭式快路逐字段等价、CellGeometry 三态装配、densifyCellContour 密采样闭合、
 * contour Node 可连接、datumAnchor 三态 parity，以及无 projectCell 坐标系 fail-loud。
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

const expandOf = (spec: PlotSpec, datasets: Datasets, options: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

const firstLayer = (spec: PlotSpec, datasets: Datasets, options: LowerPlotsOptions): IRScope => expandOf(spec, datasets, options).children[0] as IRScope;

/** 深度收集图层内所有 node（无 color → 直接子；有 color → 藏在分色子 Scope 里） */
const nodesOf = (layer: IRScope): Array<IRNode> => {
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

/** 简易线性 PositionScale 桩（domain → range 线性映射，bandwidth 固定）；只用于本文件单元断言 */
const linearStub = (domain: [number, number], range: [number, number], bandwidth = 0): PositionScale => {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  return {
    coordinate: (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? r0 + ((value - d0) / (d1 - d0)) * (r1 - r0) : NaN),
    get bandwidth() {
      return bandwidth;
    },
    ticks: () => ({ ticks: [], labels: [] }) as unknown as ReturnType<PositionScale['ticks']>,
    range: () => [r0, r1],
    setRange: () => undefined,
  };
};

// ── projectCell 闭式快路：cartesian → rect、polar → sector ──────────────────────────────
describe('projectCell 闭式快路（rect / sector）', () => {
  it('cartesian_projectcell_returns_rect', () => {
    const frame = createCartesianFrame(linearStub([0, 10], [0, 100], 20), linearStub([0, 10], [200, 0]));
    // primary 像素带 [40,60]、secondary 像素 [200,120] → rect 中心 [50,160]、width 20、height 80
    const cell: Cell = { intervals: { x: [40, 60], y: [200, 120] } };
    const geometry = frame.projectCell(cell);
    expect(geometry).toEqual({ kind: 'rect', position: [50, 160], width: 20, height: 80 });
  });

  it('polar_projectcell_returns_sector', () => {
    const frame = createPolarFrame({
      center: [200, 200],
      innerRadius: 0,
      outerRadius: 150,
      startAngle: 0,
      endAngle: 360,
      continuousAngle: false,
      primary: linearStub([0, 1], [0, 360]),
      secondary: linearStub([0, 1], [0, 150]),
    });
    const cell: Cell = { intervals: { angle: [30, 90], radius: [40, 120] } };
    const geometry = frame.projectCell(cell);
    expect(geometry).toEqual({ kind: 'sector', center: [200, 200], innerRadius: 40, outerRadius: 120, startAngle: 30, endAngle: 90 });
  });
});

// ── cartesian / polar interval / sector 经 lowerPlots 的产物基线（byte-equal 回归网）─────────
const WIDTH = 400;
const HEIGHT = 400;
const cartOpts: LowerPlotsOptions = { width: WIDTH, height: HEIGHT };

const cartesianBarSpec = (arrangement?: 'stack', series?: string): PlotSpec =>
  PlotSpecSchema.parse({
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
        encoding: { x: { field: 'm' }, y: { field: 'v' } },
        ...(arrangement === 'stack' || series
          ? {
              bounds: {
                ...(series ? { x: { kind: 'band', group: series } } : {}),
                ...(arrangement === 'stack' ? { y: { kind: 'extent', from: 'y0', to: 'y1' } } : {}),
              },
            }
          : {}),
        ...(series ? { series } : {}),
      },
    ],
  });

describe('cartesian interval → rect 产物（byte-equal 回归基线）', () => {
  it('cartesian_interval_plain_rect_nodes', () => {
    const rows = [{ m: 'A', v: 3 }, { m: 'B', v: 6 }, { m: 'C', v: 9 }];
    const nodes = nodesOf(firstLayer(cartesianBarSpec(), { d: rows }, cartOpts));
    expect(nodes).toHaveLength(3);
    for (const node of nodes) {
      expect(node.type).toBe('node');
      expect(typeof node.minimumWidth).toBe('number');
      expect(typeof node.minimumHeight).toBe('number');
      // 矩形柱无 shape ref（barStyle 在 nodeDefault 给 rectangle）；position 为 [x, y]
      expect(node.shape).toBeUndefined();
      expect(Array.isArray(node.position)).toBe(true);
    }
    // 柱宽相等（同 bandwidth）、柱高随 value 单调
    expect(nodes[0].minimumWidth).toBeCloseTo(nodes[1].minimumWidth as number, 9);
    expect((nodes[2].minimumHeight as number) > (nodes[0].minimumHeight as number)).toBe(true);
  });

  it('cartesian_interval_dodge_rect_subwidth', () => {
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
    expect((nodes[0].minimumWidth as number) < (plain[0].minimumWidth as number)).toBe(true);
  });

  it('cartesian_interval_compiles_to_scene', () => {
    const rows = [{ m: 'A', v: 3 }, { m: 'B', v: 6 }];
    const layer = firstLayer(cartesianBarSpec(), { d: rows }, cartOpts);
    expect(() => compileToScene({ version: 1, type: 'scene', children: [layer] })).not.toThrow();
  });
});

const polarBarSpec = (): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    coordinate: { type: 'polar2D', angle: 'cat', radius: 'val' },
    scales: [
      { type: 'band', name: 'cat' },
      { type: 'linear', name: 'val' },
    ],
    marks: [{ type: 'interval', encoding: { x: { field: 'm' }, y: { field: 'v' } } }],
  });

const pieSpec = (): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    transform: [{ kind: 'stack', y: 'value' }],
    coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
    scales: [
      { type: 'linear', name: 'a' },
      { type: 'linear', name: 'r' },
    ],
    marks: [{ type: 'interval', bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } }, encoding: { color: { field: 'label' } } }],
  });

describe('polar interval / sector → sector 产物（byte-equal 回归基线）', () => {
  it('polar_interval_sector_nodes', () => {
    const rows = [{ m: 'A', v: 3 }, { m: 'B', v: 6 }, { m: 'C', v: 9 }];
    const nodes = nodesOf(firstLayer(polarBarSpec(), { d: rows }, cartOpts));
    expect(nodes).toHaveLength(3);
    for (const node of nodes) {
      const shape = node.shape as { type?: string; params?: Record<string, number> } | undefined;
      expect(shape?.type).toBe('sector');
      expect(shape!.params!.outerRadius).toBeGreaterThanOrEqual(shape!.params!.innerRadius);
    }
  });

  it('pie_sector_mark_nodes', () => {
    const rows = [{ label: 'A', value: 3 }, { label: 'B', value: 5 }, { label: 'C', value: 2 }];
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
const curvedFrame = (): CartesianFrame => {
  const base = createCartesianFrame(linearStub([0, 10], [0, 200], 40), linearStub([0, 10], [200, 0]));
  // 输出空间 (px, py) → 屏幕：x 原样、y 加一段随 px 变化的弯曲（使顶 / 底边非直线 → 必须密采样）
  const projectFn = (px: number, py: number): [number, number] => [px, py + 20 * Math.sin((px / 200) * Math.PI)];
  return {
    ...base,
    projectCell: cell => ({ kind: 'contour', points: densifyCellContour(cell, projectFn, { curvedPrimary: true, curvedSecondary: false }) }),
  };
};

const intervalMarkSpec = (): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    coordinate: { type: 'cartesian2D', x: 'cat', y: 'val' },
    scales: [
      { type: 'band', name: 'cat' },
      { type: 'linear', name: 'val' },
    ],
    marks: [{ type: 'interval', encoding: { x: { field: 'm' }, y: { field: 'v' } } }],
  });

/** 取首个 interval mark（窄化为 IntervalMark，供需 IntervalMark 的 buildIntervalContext 用） */
const firstIntervalMark = (spec: PlotSpec): IntervalMark => {
  const mark: Mark = spec.marks[0];
  if (mark.type !== 'interval') throw new Error('expected interval mark');
  return mark;
};

describe('densifyCellContour + 曲线 frame → contour 全链路', () => {
  it('densify_cell_contour_dense_and_closed', () => {
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

  it('interval_on_real_custom_frame_fail_loud', () => {
    // 真 type:'custom' frame（即便带 projectCell）无 primary band scale 构建 IntervalContext →
    //   fail-loud，不静默产空层（守「无 cell 构造即 fail-loud、无引擎自动兜底」）
    const custom = createCustomFrame(['x', 'y'], values => [Number(values[0]), Number(values[1])], {
      projectCell: (cell: Cell) => ({ kind: 'contour', points: densifyCellContour(cell, (p, s) => [p, s], { curvedPrimary: false, curvedSecondary: false }) }),
    });
    const mark = firstIntervalMark(intervalMarkSpec());
    expect(() => lowerMark(mark, [{ m: 2, v: 3 }], custom)).toThrow(/not supported|interval|custom/i);
  });

  it('curved_frame_interval_lowers_to_contour_nodes', () => {
    const mark = firstIntervalMark(intervalMarkSpec());
    const rows = [{ m: 2, v: 3 }, { m: 6, v: 6 }];
    const frame = curvedFrame();
    const layer = lowerMark(mark, rows, frame) as IRScope;
    const nodes = nodesOf(layer);
    expect(nodes).toHaveLength(2);
    for (const node of nodes) {
      const shape = node.shape as { type?: string; params?: { points?: Array<[number, number]> } } | undefined;
      expect(shape?.type).toBe('contour');
      // 顶点密采样（曲边）+ 闭合环 ≥ 4 顶点
      expect((shape!.params!.points?.length ?? 0)).toBeGreaterThanOrEqual(4);
    }
  });

  it('contour_position_is_points_aabb_center', () => {
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

  it('contour_interval_node_is_connectable', () => {
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
        { type: 'scope' as const, nodeDefault: { padding: 0, strokeWidth: 0 }, children: [node] },
        {
          type: 'path' as const,
          children: [
            { type: 'step' as const, kind: 'move' as const, to: start },
            { type: 'step' as const, kind: 'line' as const, to: { id: 'bar0' } },
          ],
        },
      ],
    };
    const compiled = compileToScene(scene);
    expect(compiled).toBeTruthy();
  });
});

// ── datumAnchor 三态 parity（locator 与 lowering 摆放同源）──────────────────────────────
describe('datumAnchor 三态与 CellGeometry 同源', () => {
  it('anchor_rect_equals_position', () => {
    const geometry = { kind: 'rect' as const, position: [50, 160] as [number, number], width: 20, height: 80 };
    expect(cellGeometryAnchor(geometry)).toEqual([50, 160]);
  });

  it('anchor_sector_is_centroid', () => {
    // mid-angle 90°、mid-radius 80 → [center + 80·cos90, center + 80·sin90] = [200, 280]
    const geometry = { kind: 'sector' as const, center: [200, 200] as [number, number], innerRadius: 60, outerRadius: 100, startAngle: 60, endAngle: 120 };
    const anchor = cellGeometryAnchor(geometry);
    expect(anchor[0]).toBeCloseTo(200, 6);
    expect(anchor[1]).toBeCloseTo(280, 6);
  });

  it('anchor_contour_is_aabb_center', () => {
    const geometry = { kind: 'contour' as const, points: [[0, 0], [10, 0], [10, 20], [0, 20]] as Array<[number, number]> };
    expect(cellGeometryAnchor(geometry)).toEqual([5, 10]);
  });

  it('datum_anchor_cartesian_interval_matches_node_position', () => {
    // datumAnchor（locator）= lowerMark 摆放的柱 Node.position（同一 frame、同源不漂移）
    const mark = firstIntervalMark(intervalMarkSpec());
    const rows = [{ m: 2, v: 3 }, { m: 6, v: 6 }];
    const frame = createCartesianFrame(linearStub([0, 10], [0, 200], 40), linearStub([0, 10], [200, 0]));
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

  it('datum_anchor_curved_interval_is_contour_aabb_center', () => {
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

// ── alpha.12 ADR-01：histogram 连续 x 区间柱（interval x0Field / x1Field）──────────────────
describe('interval x0Field / x1Field → 连续 x 区间柱（histogram）', () => {
  const histogramMark = (): IntervalMark => ({
    type: 'interval',
    bounds: { x: { kind: 'extent', from: 'binStart', to: 'binEnd' } },
    encoding: { y: { field: 'binValue' } },
  });

  it('x0x1_primary_is_continuous_interval_not_band', () => {
    // 连续 x scale（bandwidth 0）：primary cell = [coord(binStart), coord(binEnd)]、紧贴排列、宽随箱边
    const mark = histogramMark();
    const rows = [{ binStart: 0, binEnd: 2, binValue: 5 }, { binStart: 2, binEnd: 4, binValue: 3 }];
    const frame = createCartesianFrame(linearStub([0, 10], [0, 200], 0), linearStub([0, 10], [200, 0]));
    const nodes = nodesOf(lowerMark(mark, rows, frame) as IRScope);
    expect(nodes).toHaveLength(2);
    // coord(0)=0, coord(2)=40, coord(4)=80 → 宽 40 各；中心 20 / 60；紧贴（node0 右 = node1 左）
    expect(nodes[0].minimumWidth).toBeCloseTo(40, 9);
    expect(nodes[1].minimumWidth).toBeCloseTo(40, 9);
    expect((nodes[0].position as [number, number])[0]).toBeCloseTo(20, 9);
    expect((nodes[1].position as [number, number])[0]).toBeCloseTo(60, 9);
    // secondary 高度 = coord(0)..coord(binValue)：bar0 = |200-100|=100、bar1 = |200-140|=60
    expect(nodes[0].minimumHeight).toBeCloseTo(100, 9);
    expect(nodes[1].minimumHeight).toBeCloseTo(60, 9);
  });

  it('x0x1_unequal_width_bins_follow_edges', () => {
    // 不等宽箱（thresholds 派生）：宽随各自箱边
    const mark = histogramMark();
    const rows = [{ binStart: 0, binEnd: 1, binValue: 2 }, { binStart: 1, binEnd: 5, binValue: 4 }];
    const frame = createCartesianFrame(linearStub([0, 10], [0, 200], 0), linearStub([0, 10], [200, 0]));
    const nodes = nodesOf(lowerMark(mark, rows, frame) as IRScope);
    // coord(1)-coord(0)=20、coord(5)-coord(1)=80
    expect(nodes[0].minimumWidth).toBeCloseTo(20, 9);
    expect(nodes[1].minimumWidth).toBeCloseTo(80, 9);
  });

  it('x0x1_histogram_end_to_end_renders_continuous_bars', () => {
    // 经 lowerPlots：bin transform + interval x0/x1（连续 x linear scale）→ 紧贴直方柱，可 compile
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      transform: [{ kind: 'bin', field: 'm', step: 2, reduce: 'count' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      marks: [{ type: 'interval', bounds: { x: { kind: 'extent', from: 'binStart', to: 'binEnd' } }, encoding: { y: { field: 'binValue' } } }],
    });
    const rows = [{ m: 0 }, { m: 1 }, { m: 3 }, { m: 5 }];
    const layer = firstLayer(spec, { d: rows }, cartOpts);
    const nodes = nodesOf(layer);
    // step 2、域 [0,5] → 箱 [0,2),[2,4),[4,6] → 3 箱（含空箱可能）；至少有柱、且可编译
    expect(nodes.length).toBeGreaterThanOrEqual(1);
    expect(() => compileToScene({ version: 1, type: 'scene', children: [layer] })).not.toThrow();
  });
});

// ── fail-loud：无 projectCell 的坐标系 / 不支持的 cell bound ──────────────────────────────
describe('cell 类 mark 在无 projectCell 坐标系 fail-loud', () => {
  it('interval_1d_fails_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      coordinate: { type: 'cartesian1D', x: 'cat' },
      scales: [{ type: 'band', name: 'cat' }],
      marks: [{ type: 'interval', encoding: { x: { field: 'm' }, y: { field: 'v' } } }],
    });
    expect(() => expandOf(spec, { d: [{ m: 'A', v: 3 }] }, cartOpts)).toThrow(/cartesian1D|not supported|interval/i);
  });

  it('interval_ternary_default_band_bound_fails_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      coordinate: { type: 'ternary2D' },
      scales: [],
      marks: [{ type: 'interval', encoding: { x: { field: 'x' }, y: { field: 'y' }, z: { field: 'z' } } }],
    });
    expect(() => expandOf(spec, { d: [{ x: 1, y: 1, z: 1 }] }, cartOpts)).toThrow(/ternary|band bounds/i);
  });

  it('interval_custom_without_projectcell_fails_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'custom', name: 'noproj', roles: ['x', 'y'] },
      marks: [{ type: 'interval', encoding: { x: { field: 'm' }, y: { field: 'v' } } }],
    });
    // custom 工厂返回无 projectCell 的 frame → interval fail-loud（指明缺 projectCell）
    const options: LowerPlotsOptions = {
      width: WIDTH,
      height: HEIGHT,
      coordinates: {
        noproj: ctx => {
          const xScale = ctx.linearScaleFor('x', [0, ctx.width]);
          const yScale = ctx.linearScaleFor('y', [ctx.height, 0]);
          return {
            type: 'custom',
            roles: ['x', 'y'],
            project: () => null,
            projectRoles: values => {
              const x = xScale.coordinate(values[0]);
              const y = yScale.coordinate(values[1]);
              return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
            },
          };
        },
      },
    };
    expect(() => expandOf(spec, { d: [{ m: 1, v: 3 }] }, options)).toThrow(/custom coordinate|projectCell|not supported/i);
  });
});
