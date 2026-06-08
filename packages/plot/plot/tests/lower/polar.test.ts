import type { IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';

/**
 * ADR-01 polar 投影 lowering 测试。
 * 断言 lowerPlots 产出的 core IR（node position / 结构），不碰内部 CoordinateFrame 方法。
 * 投影约定（ADR §2）：θ=angleScale(angleValue) 度、r=radiusScale(radiusValue)，
 *   返回 [cx + r·cos(θ°), cy + r·sin(θ°)]；0°=+x、90°=+y（屏幕 y 向下）。
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

const expandOf = (spec: PlotSpec, datasets: Datasets, options?: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

/** 第一个 mark 图层 scope（外层 plot scope 的第一个子 scope） */
const firstLayer = (spec: PlotSpec, datasets: Datasets, options?: LowerPlotsOptions): IRScope =>
  expandOf(spec, datasets, options).children[0] as IRScope;

/** 取一个 point 图层里所有 node 的 position（point 无 color 时为单层 nodeDefault + 裸 node） */
const positionsOf = (layer: IRScope): Array<[number, number]> =>
  layer.children.map(child => (child as IRNode).position as [number, number]);

const opts: LowerPlotsOptions = { width: 480, height: 300 };

/** 角向 a / 径向 r，均线性；用裸 x/y 通道（复用语义）或显式 angle/radius 通道 */
const polarPointSpec = (encoding: Record<string, unknown>, extra: Partial<Record<string, unknown>> = {}): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'a' },
      { type: 'linear', name: 'r' },
    ],
    coordinate: { type: 'polar2D', angle: 'a', radius: 'r', ...extra },
    marks: [{ type: 'point', encoding }],
  });

describe('lowerPlots polar 投影几何 (ADR-01)', () => {
  // Happy path
  it('polar_point_angle0_radiusmax_lands_right_of_center', () => {
    // 角向 domain 显式 [0,360]，行 angle=0 → θ=startAngle=0°；径向 domain [0,10]、值=10 → r=outerRadius
    // 期望屏幕点 [cx + outerRadius, cy]：x > cx、y ≈ cy（屏幕 y 不变）
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a', domain: [0, 360] },
        { type: 'linear', name: 'r', domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [
        {
          type: 'point',
          encoding: { x: { field: 'theta' }, y: { field: 'value' } },
        },
      ],
    });
    // 两行：一行落圆心（r=0），一行 angle=0 / r=max
    const rows = [
      { theta: 0, value: 0 }, // 圆心
      { theta: 0, value: 10 }, // 圆心右侧 outerRadius 处
    ];
    const layer = firstLayer(spec, { d: rows }, opts);
    const [center, rightmost] = positionsOf(layer);
    // angle=0、radius=0 → 圆心
    // angle=0、radius=max → [cx + outerRadius, cy]：同 y、x 更大
    expect(rightmost[1]).toBeCloseTo(center[1], 6);
    expect(rightmost[0]).toBeGreaterThan(center[0]);
  });

  it('polar_quarter_turn_lands_below_center', () => {
    // angle=90 → θ=90° → cos=0、sin=1 → [cx, cy + r]（屏幕 y 向下，90° 在圆心下方）
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a', domain: [0, 360] },
        { type: 'linear', name: 'r', domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'point', encoding: { x: { field: 'theta' }, y: { field: 'value' } } }],
    });
    const rows = [
      { theta: 0, value: 0 }, // 圆心
      { theta: 90, value: 10 }, // 圆心正下方 outerRadius 处
    ];
    const [center, quarter] = positionsOf(firstLayer(spec, { d: rows }, opts));
    expect(quarter[0]).toBeCloseTo(center[0], 6); // 同 x
    expect(quarter[1]).toBeGreaterThan(center[1]); // 屏幕下方（y 更大）
  });

  // 交互：polar 下 x/y 被坐标系重解释为 angle/radius（x/y 是唯一位置通道）
  it('polar_xy_channels_projected_via_coordinate', () => {
    const rows = [
      { theta: 45, value: 7 },
      { theta: 200, value: 3 },
    ];
    const positions = positionsOf(firstLayer(polarPointSpec({ x: { field: 'theta' }, y: { field: 'value' } }), { d: rows }, opts));
    expect(positions).toHaveLength(2);
    for (const [px, py] of positions) {
      expect(Number.isFinite(px)).toBe(true);
      expect(Number.isFinite(py)).toBe(true);
    }
  });

  // 边界：整圆 vs 半圆 — 角向 range 随 endAngle 缩放
  it('half_circle_vs_full_circle_scales_angular_range', () => {
    // 同一 angle 值（domain 中点）在整圆 vs 半圆下投影到不同角度
    const rows = [
      { theta: 0, value: 0 }, // 圆心，定 cx/cy
      { theta: 0.5, value: 10 }, // domain 中点
    ];
    const fullSpec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a', domain: [0, 1] },
        { type: 'linear', name: 'r', domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' }, // endAngle=360
      marks: [{ type: 'point', encoding: { x: { field: 'theta' }, y: { field: 'value' } } }],
    });
    const halfSpec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a', domain: [0, 1] },
        { type: 'linear', name: 'r', domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r', endAngle: 180 },
      marks: [{ type: 'point', encoding: { x: { field: 'theta' }, y: { field: 'value' } } }],
    });
    const [fullCenter, fullMid] = positionsOf(firstLayer(fullSpec, { d: rows }, opts));
    const [halfCenter, halfMid] = positionsOf(firstLayer(halfSpec, { d: rows }, opts));
    // 整圆 domain 中点 θ=180° → 圆心左侧（x < cx）；半圆 domain 中点 θ=90° → 圆心下方（x ≈ cx, y > cy）
    expect(fullMid[0]).toBeLessThan(fullCenter[0]);
    expect(halfMid[0]).toBeCloseTo(halfCenter[0], 4);
    expect(halfMid[1]).toBeGreaterThan(halfCenter[1]);
  });

  // 边界：innerRadius>0 — radius domain min → frame.innerRadius（非圆心）
  it('inner_radius_min_value_off_center', () => {
    const rows = [
      { theta: 0, value: 0 }, // radius domain min
      { theta: 0, value: 10 }, // radius domain max
    ];
    // 先求圆心：用 innerRadius=0 时 r=0 → 圆心
    const solidSpec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a', domain: [0, 360] },
        { type: 'linear', name: 'r', domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'point', encoding: { x: { field: 'theta' }, y: { field: 'value' } } }],
    });
    const [solidMin] = positionsOf(firstLayer(solidSpec, { d: rows }, opts)); // = 圆心
    // donut：innerRadius=0.5 → radius domain min 映射到 frame.innerRadius（圆心右侧、非圆心）
    const donutSpec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a', domain: [0, 360] },
        { type: 'linear', name: 'r', domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r', innerRadius: 0.5 },
      marks: [{ type: 'point', encoding: { x: { field: 'theta' }, y: { field: 'value' } } }],
    });
    const [donutMin, donutMax] = positionsOf(firstLayer(donutSpec, { d: rows }, opts));
    // angle=0 → 全在圆心 y 上、向右展开。donut 的 min 不在圆心（x 比 solid 的圆心大），且仍小于 max
    expect(donutMin[0]).toBeGreaterThan(solidMin[0]);
    expect(donutMin[0]).toBeLessThan(donutMax[0]);
    expect(donutMin[1]).toBeCloseTo(solidMin[1], 4);
  });

  // 边界：band 角向 scale — 类别绕圆周
  it('band_angular_scale_distributes_categories_around_circle', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'band', name: 'a' },
        { type: 'linear', name: 'r', domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'point', encoding: { x: { field: 'cat' }, y: { field: 'value' } } }],
    });
    const rows = [
      { cat: 'A', value: 10 },
      { cat: 'B', value: 10 },
      { cat: 'C', value: 10 },
      { cat: 'D', value: 10 },
    ];
    const positions = positionsOf(firstLayer(spec, { d: rows }, opts));
    expect(positions).toHaveLength(4);
    // 等半径、不同类别 → 不同角度 → 各点互异（绕圆周分布）
    const distinctX = new Set(positions.map(p => p[0].toFixed(3)));
    expect(distinctX.size).toBeGreaterThan(1);
  });

  // 边界：非有限值跳过（守 alpha.1 语义）
  it('non_finite_radius_skipped', () => {
    const rows = [
      { theta: 0, value: 5 },
      { theta: 1, value: 'oops' }, // 非有限径向 → 跳过
      { theta: 2, value: 9 },
    ];
    expect(positionsOf(firstLayer(polarPointSpec({ x: { field: 'theta' }, y: { field: 'value' } }), { d: rows }, opts))).toHaveLength(2);
  });

  // 端到端：多行 point 各落对应极坐标点（结构完整）
  it('polar_point_end_to_end_all_rows_placed', () => {
    const rows = [
      { theta: 0, value: 4 },
      { theta: 90, value: 6 },
      { theta: 180, value: 8 },
    ];
    const layer = firstLayer(polarPointSpec({ x: { field: 'theta' }, y: { field: 'value' } }, { angle: 'a', radius: 'r', startAngle: 0, endAngle: 360 }), { d: rows }, opts);
    expect(layer.nodeDefault?.shape).toBe('circle');
    expect(positionsOf(layer)).toHaveLength(3);
    expect(positionsOf(layer).every(p => Number.isFinite(p[0]) && Number.isFinite(p[1]))).toBe(true);
  });

  // 交互：polar × color 编码 → 分色子 Scope（不受坐标系影响）
  it('polar_with_color_groups_into_subscopes', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a', domain: [0, 360] },
        { type: 'linear', name: 'r', domain: [0, 10] },
        { type: 'ordinal', name: 'col', range: ['#aa', '#bb'] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'point', encoding: { x: { field: 'theta' }, y: { field: 'value' }, color: { field: 'g', scale: 'col' } } }],
    });
    const rows = [
      { theta: 0, value: 5, g: 'X' },
      { theta: 90, value: 6, g: 'Y' },
      { theta: 180, value: 7, g: 'X' },
    ];
    const layer = firstLayer(spec, { d: rows }, opts);
    expect(layer.children).toHaveLength(2); // 2 类别 → 2 子 Scope
    expect((layer.children[0] as IRScope).nodeDefault?.fill).toBe('#aa');
    expect((layer.children[1] as IRScope).nodeDefault?.fill).toBe('#bb');
  });

  // 错误路径
  it('polar_angle_references_unknown_scale_throws', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a' },
        { type: 'linear', name: 'r' },
      ],
      coordinate: { type: 'polar2D', angle: 'missing', radius: 'r' },
      marks: [{ type: 'point', encoding: { x: { field: 'theta' }, y: { field: 'value' } } }],
    });
    expect(() => expandOf(spec, { d: [{ theta: 0, value: 1 }] }, opts)).toThrow(/missing|unknown scale/);
  });

  it('ordinal_scale_as_angular_position_throws', () => {
    // ordinal 不可作位置通道（复用 resolvePositionScale 守卫）
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'ordinal', name: 'a' },
        { type: 'linear', name: 'r' },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'point', encoding: { x: { field: 'cat' }, y: { field: 'value' } } }],
    });
    expect(() => expandOf(spec, { d: [{ cat: 'A', value: 1 }] }, opts)).toThrow(/ordinal/);
  });

  // ADR-01（alpha.9）：位置通道完整性从 schema 转 coordinate 级 lowering 校验——
  // x/y 在 parse 期合法（可选），缺角色在 lowering fail-loud（polar2D / cartesian2D 都需 x+y）。
  it('polar_encoding_missing_y_fails_loud_at_lowering', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a' },
        { type: 'linear', name: 'r' },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'point', encoding: { x: { field: 'theta' } } }],
    });
    expect(() => expandOf(spec, { d: [{ theta: 0 }] }, opts)).toThrow(/polar2D|requires|y/i);
  });

  it('cartesian_encoding_missing_x_fails_loud_at_lowering', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'x' },
      marks: [{ type: 'point', encoding: { y: { field: 'value' } } }],
    });
    expect(() => expandOf(spec, { d: [{ value: 1 }] }, opts)).toThrow(/cartesian2D|requires|x/i);
  });
});

// 回归：cartesian2D point 产物与既有行为一致（frame 重构零行为改变）
describe('lowerPlots cartesian 回归 (ADR-01)', () => {
  const SALES = [
    { month: 0, revenue: 10 },
    { month: 1, revenue: 14 },
    { month: 2, revenue: 9 },
  ];
  const cartPointSpec: PlotSpec = PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'sales' },
    scales: [
      { type: 'linear', name: 'xMonth' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
  });

  it('cartesian_point_positions_unchanged', () => {
    // 无 guides → plot area 满；domain x[0,2]->[0,480]、y[9,14]->[300,0]
    const layer = firstLayer(cartPointSpec, { sales: SALES }, opts);
    const positions = positionsOf(layer);
    expect(positions[0]).toEqual([0, 240]);
    expect(positions[2][0]).toBe(480);
  });
});
