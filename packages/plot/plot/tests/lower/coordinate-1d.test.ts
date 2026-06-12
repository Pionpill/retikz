import type { IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';

/**
 * ADR-02（alpha.9）一维坐标系族 lowering 测试：cartesian1D（直线）+ polar1D（圆周）。
 * 经公开 lowerPlots 断言 core IR node position：
 *   cartesian1D 单维投影落基线轴 + orientation；polar1D 角向投影落固定半径圆周 + radius / 半环；
 *   mark 矩阵 point 为主（interval/sector/area fail-loud）；缺单维通道 / 非法维度 fail-loud；1D×color 仍工作。
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

const opts: LowerPlotsOptions = { width: 480, height: 300 };

const dist = (a: [number, number], b: [number, number]): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('cartesian1D 直线坐标系 (ADR-02)', () => {
  const rugSpec = (extra: Record<string, unknown> = {}): PlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'xs', domain: [0, 10] }],
      coordinate: { type: 'cartesian1D', x: 'xs', ...extra },
      marks: [{ type: 'point', encoding: { x: { field: 'v' } } }],
    });

  // Happy path：水平 rug — 各点落底边基线轴、x 随值展开
  it('horizontal_rug_points_on_baseline', () => {
    const rows = [{ v: 0 }, { v: 5 }, { v: 10 }];
    const positions = positionsOf(firstLayer(rugSpec(), { d: rows }, opts));
    // 无 guides → plotArea 满 480×300；baseline = 底边 y=300；x domain[0,10]→[0,480]
    expect(positions[0]).toEqual([0, 300]);
    expect(positions[1]).toEqual([240, 300]);
    expect(positions[2]).toEqual([480, 300]);
  });

  // Happy path：垂直 orientation — 各点落左边基线、y 随值
  it('vertical_orientation_points_on_left_baseline', () => {
    const rows = [{ v: 0 }, { v: 10 }];
    const positions = positionsOf(firstLayer(rugSpec({ orientation: 'vertical' }), { d: rows }, opts));
    // baseline = 左边 x=0；y domain[0,10]→[300,0]（屏幕 y 向下倒置）
    expect(positions[0]).toEqual([0, 300]);
    expect(positions[1]).toEqual([0, 0]);
  });

  // 边界：单数据点不崩
  it('single_point_ok', () => {
    expect(positionsOf(firstLayer(rugSpec(), { d: [{ v: 4 }] }, opts))).toHaveLength(1);
  });

  // 交互：1D × categorical color → 分色子 Scope（非位置通道仍工作）
  it('cartesian1d_with_color_groups_into_subscopes', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'xs', domain: [0, 10] },
        { type: 'ordinal', name: 'col', range: ['#aa', '#bb'] },
      ],
      coordinate: { type: 'cartesian1D', x: 'xs' },
      marks: [{ type: 'point', encoding: { x: { field: 'v' }, color: { field: 'g', scale: 'col' } } }],
    });
    const layer = firstLayer(spec, { d: [{ v: 1, g: 'X' }, { v: 9, g: 'Y' }] }, opts);
    expect(layer.children).toHaveLength(2);
  });

  // 错误路径：interval（柱）在 cartesian1D 无几何意义 → fail-loud
  it('cartesian1d_interval_fails_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'band', name: 'xs' }],
      coordinate: { type: 'cartesian1D', x: 'xs' },
      marks: [{ type: 'interval', encoding: { x: { field: 'cat' }, y: { field: 'v' } } }],
    });
    expect(() => expandOf(spec, { d: [{ cat: 'A', v: 3 }] }, opts)).toThrow(/cartesian1D|not supported|interval/i);
  });

  // 错误路径：缺单维通道 → fail-loud（ADR-01 必填角色校验）
  it('cartesian1d_missing_x_fails_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'xs' }],
      coordinate: { type: 'cartesian1D', x: 'xs' },
      marks: [{ type: 'point', encoding: { color: { value: '#333' } } }],
    });
    expect(() => expandOf(spec, { d: [{ v: 1 }] }, opts)).toThrow(/cartesian1D|requires|x/i);
  });

  // 错误路径：非法维度（cartesian1D 合法集 {x}）→ fail-loud
  it('cartesian1d_angle_dimension_fails_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'xs', domain: [0, 10] }],
      coordinate: { type: 'cartesian1D', x: 'xs' },
      marks: [{ type: 'point', encoding: { x: { field: 'v' } } }],
      guides: [{ type: 'axis', dimension: 'angle' }],
    });
    expect(() => expandOf(spec, { d: [{ v: 1 }] }, opts)).toThrow(/cartesian1D|not support|dimension|angle/i);
  });

  // 交互：1D 直线轴 guide 下沉（dimension x 合法、产出轴层）
  it('cartesian1d_axis_guide_lowers', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'xs', domain: [0, 10] }],
      coordinate: { type: 'cartesian1D', x: 'xs' },
      marks: [{ type: 'point', encoding: { x: { field: 'v' } } }],
      guides: [{ type: 'axis', dimension: 'x' }],
    });
    const root = expandOf(spec, { d: [{ v: 1 }, { v: 9 }] }, opts);
    // 轴层在 mark 之后（压顶）；至少有 mark 层 + 轴层两个 children
    expect(root.children.length).toBeGreaterThanOrEqual(2);
  });
});

describe('polar1D 圆周坐标系 (ADR-02)', () => {
  // 布局：480×300、无角向轴 → 圆心 [240,150]、outerRadius 150
  const CENTER: [number, number] = [240, 150];

  const ringSpec = (extra: Record<string, unknown> = {}): PlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'a', domain: [0, 360] }],
      coordinate: { type: 'polar1D', angle: 'a', ...extra },
      marks: [{ type: 'point', encoding: { x: { field: 'deg' } } }],
    });

  // Happy path：角向投影落半径 R=150 圆周（angle 0 → 圆心右、angle 90 → 圆心下）
  it('polar1d_points_on_circle', () => {
    const positions = positionsOf(firstLayer(ringSpec(), { d: [{ deg: 0 }, { deg: 90 }] }, opts));
    expect(positions[0][0]).toBeCloseTo(390, 4); // [240+150, 150]
    expect(positions[0][1]).toBeCloseTo(150, 4);
    expect(positions[1][0]).toBeCloseTo(240, 4); // [240, 150+150]
    expect(positions[1][1]).toBeCloseTo(300, 4);
    for (const p of positions) expect(dist(p, CENTER)).toBeCloseTo(150, 4);
  });

  // 边界：radius 占比 0.5 → 落半径一半（75）的圈
  it('polar1d_radius_fraction_halves_circle', () => {
    const [p] = positionsOf(firstLayer(ringSpec({ radius: 0.5 }), { d: [{ deg: 0 }] }, opts));
    expect(dist(p, CENTER)).toBeCloseTo(75, 4);
    expect(p[0]).toBeCloseTo(315, 4); // 240 + 75
  });

  // 边界：半环 startAngle/endAngle — 角向 range 缩到 [0,180]
  it('polar1d_half_arc_scales_angular_range', () => {
    // domain[0,360] range[0,180]：deg=360 → θ=180° → 圆心左侧
    const [p] = positionsOf(firstLayer(ringSpec({ startAngle: 0, endAngle: 180 }), { d: [{ deg: 360 }] }, opts));
    expect(p[0]).toBeLessThan(CENTER[0]);
    expect(p[1]).toBeCloseTo(CENTER[1], 3);
    expect(dist(p, CENTER)).toBeCloseTo(150, 4);
  });

  // 交互：polar1D 复用 angle（x 别名）+ 角向轴 guide 下沉
  it('polar1d_angular_axis_guide_lowers', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'a', domain: [0, 360] }],
      coordinate: { type: 'polar1D', angle: 'a' },
      marks: [{ type: 'point', encoding: { x: { field: 'deg' } } }],
      guides: [{ type: 'axis', dimension: 'angle' }],
    });
    const root = expandOf(spec, { d: [{ deg: 0 }, { deg: 120 }, { deg: 240 }] }, opts);
    expect(root.children.length).toBeGreaterThanOrEqual(2);
  });

  // 错误路径：sector 在 polar1D 无几何意义 → fail-loud
  it('polar1d_sector_fails_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'a' }],
      coordinate: { type: 'polar1D', angle: 'a' },
      marks: [{ type: 'sector', encoding: { color: { field: 'label' } } }],
    });
    expect(() => expandOf(spec, { d: [{ label: 'A', v: 1 }] }, opts)).toThrow(/polar1D|not supported|sector/i);
  });

  // 错误路径：非法维度（polar1D 合法集 {angle, x}）→ fail-loud
  it('polar1d_radius_dimension_fails_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'a', domain: [0, 360] }],
      coordinate: { type: 'polar1D', angle: 'a' },
      marks: [{ type: 'point', encoding: { x: { field: 'deg' } } }],
      guides: [{ type: 'axis', dimension: 'radius' }],
    });
    expect(() => expandOf(spec, { d: [{ deg: 0 }] }, opts)).toThrow(/polar1D|not support|dimension|radius/i);
  });
});
