import type { IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';

/**
 * ADR-03（alpha.9）ternary2D 三元坐标系 lowering 测试。
 * 经公开 lowerPlots 断言 core IR node position：
 *   三连续通道 a/b/c 自动归一化 → 重心坐标投影到等边三角内；纯分量落顶点、(1/3,1/3,1/3) 落重心；
 *   和≤0 / 含负 fail-loud；缺 a/b/c 任一 fail-loud；interval/sector fail-loud；三角轴 guide；色编码。
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

const opts: LowerPlotsOptions = { width: 400, height: 400 };

const ternarySpec = (extra: Record<string, unknown> = {}): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [],
    coordinate: { type: 'ternary2D' },
    marks: [{ type: 'point', encoding: { a: { field: 'a' }, b: { field: 'b' }, c: { field: 'c' } } }],
    ...extra,
  });

/** 取三个纯分量顶点（a/b/c 各 100%）的投影点，作几何参照 */
const pureVertices = (): { va: [number, number]; vb: [number, number]; vc: [number, number] } => {
  const positions = positionsOf(firstLayer(ternarySpec(), { d: [{ a: 1, b: 0, c: 0 }, { a: 0, b: 1, c: 0 }, { a: 0, b: 0, c: 1 }] }, opts));
  return { va: positions[0], vb: positions[1], vc: positions[2] };
};

describe('ternary2D 重心投影 (ADR-03)', () => {
  // Happy path：纯分量落三角顶点（a=顶点朝上、b=右下、c=左下）
  it('pure_components_land_on_vertices', () => {
    const { va, vb, vc } = pureVertices();
    // a 顶点最高（屏幕 y 最小）；b 在右（x 最大）；c 在左（x 最小）
    expect(va[1]).toBeLessThan(vb[1]);
    expect(va[1]).toBeLessThan(vc[1]);
    expect(vb[0]).toBeGreaterThan(va[0]);
    expect(vc[0]).toBeLessThan(va[0]);
  });

  // Happy path：(1/3,1/3,1/3) 落三角重心（三顶点平均）
  it('balanced_lands_on_centroid', () => {
    const { va, vb, vc } = pureVertices();
    const centroid: [number, number] = [(va[0] + vb[0] + vc[0]) / 3, (va[1] + vb[1] + vc[1]) / 3];
    const [p] = positionsOf(firstLayer(ternarySpec(), { d: [{ a: 1, b: 1, c: 1 }] }, opts));
    expect(p[0]).toBeCloseTo(centroid[0], 4);
    expect(p[1]).toBeCloseTo(centroid[1], 4);
  });

  // Happy path：自动归一化 — (1,1,1) 与 (10,10,10) 投影到同一点
  it('auto_normalization_scale_invariant', () => {
    const [p1] = positionsOf(firstLayer(ternarySpec(), { d: [{ a: 1, b: 1, c: 1 }] }, opts));
    const [p10] = positionsOf(firstLayer(ternarySpec(), { d: [{ a: 10, b: 10, c: 10 }] }, opts));
    expect(p10[0]).toBeCloseTo(p1[0], 6);
    expect(p10[1]).toBeCloseTo(p1[1], 6);
  });

  // 边界：非归一三元组 (50,30,20) → 归一化 (0.5,0.3,0.2)
  it('non_normalized_triple_normalized', () => {
    const { va, vb, vc } = pureVertices();
    const expected: [number, number] = [0.5 * va[0] + 0.3 * vb[0] + 0.2 * vc[0], 0.5 * va[1] + 0.3 * vb[1] + 0.2 * vc[1]];
    const [p] = positionsOf(firstLayer(ternarySpec(), { d: [{ a: 50, b: 30, c: 20 }] }, opts));
    expect(p[0]).toBeCloseTo(expected[0], 4);
    expect(p[1]).toBeCloseTo(expected[1], 4);
  });

  // 边界：单分量为 0 — (0,1,1) 落 bc 边中点
  it('zero_component_on_edge', () => {
    const { vb, vc } = pureVertices();
    const mid: [number, number] = [(vb[0] + vc[0]) / 2, (vb[1] + vc[1]) / 2];
    const [p] = positionsOf(firstLayer(ternarySpec(), { d: [{ a: 0, b: 1, c: 1 }] }, opts));
    expect(p[0]).toBeCloseTo(mid[0], 4);
    expect(p[1]).toBeCloseTo(mid[1], 4);
  });

  // 多行散点
  it('multiple_points_placed', () => {
    const rows = [{ a: 1, b: 1, c: 1 }, { a: 2, b: 1, c: 1 }, { a: 1, b: 2, c: 1 }];
    expect(positionsOf(firstLayer(ternarySpec(), { d: rows }, opts))).toHaveLength(3);
  });
});

describe('ternary2D fail-loud (ADR-03)', () => {
  // 错误路径：和为 0 → fail-loud
  it('sum_zero_fails_loud', () => {
    expect(() => expandOf(ternarySpec(), { d: [{ a: 0, b: 0, c: 0 }] }, opts)).toThrow(/ternary|a\+b\+c|> 0/i);
  });

  // 错误路径：含负 → fail-loud
  it('negative_component_fails_loud', () => {
    expect(() => expandOf(ternarySpec(), { d: [{ a: -1, b: 1, c: 1 }] }, opts)).toThrow(/ternary|non-negative|negative/i);
  });

  // 错误路径：各分量有限但和上溢 Infinity → fail-loud（adversarial B1：曾静默投到原点 [0,0]）
  it('sum_overflow_fails_loud', () => {
    expect(() => expandOf(ternarySpec(), { d: [{ a: 1e308, b: 1e308, c: 1e308 }] }, opts)).toThrow(/ternary|overflow/i);
  });

  // 错误路径：缺 c 角色 → fail-loud（ADR-01 必填角色校验，ternary 需 a/b/c）
  it('missing_c_channel_fails_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'ternary2D' },
      marks: [{ type: 'point', encoding: { a: { field: 'a' }, b: { field: 'b' } } }],
    });
    expect(() => expandOf(spec, { d: [{ a: 1, b: 1 }] }, opts)).toThrow(/ternary2D|requires|c/i);
  });

  // 错误路径：interval 在 ternary 无几何意义 → fail-loud
  it('interval_fails_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'band', name: 'xs' }],
      coordinate: { type: 'ternary2D' },
      marks: [{ type: 'interval', encoding: { x: { field: 'cat' }, y: { field: 'v' } } }],
    });
    expect(() => expandOf(spec, { d: [{ cat: 'A', v: 1 }] }, opts)).toThrow(/ternary2D|not supported|interval/i);
  });

  // 错误路径：非法维度（ternary 合法集 {a,b,c}）→ fail-loud
  it('x_dimension_fails_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'ternary2D' },
      marks: [{ type: 'point', encoding: { a: { field: 'a' }, b: { field: 'b' }, c: { field: 'c' } } }],
      guides: [{ type: 'axis', dimension: 'x' }],
    });
    expect(() => expandOf(spec, { d: [{ a: 1, b: 1, c: 1 }] }, opts)).toThrow(/ternary2D|not support|dimension|x/i);
  });
});

describe('ternary2D guide + color (ADR-03)', () => {
  // 交互：三角轴 guide（a/b/c 三条边）下沉
  it('triangle_axis_guides_lower', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'ternary2D' },
      marks: [{ type: 'point', encoding: { a: { field: 'a' }, b: { field: 'b' }, c: { field: 'c' } } }],
      guides: [
        { type: 'axis', dimension: 'a' },
        { type: 'axis', dimension: 'b' },
        { type: 'axis', dimension: 'c' },
      ],
    });
    const root = expandOf(spec, { d: [{ a: 1, b: 1, c: 1 }, { a: 2, b: 1, c: 1 }] }, opts);
    // mark 层 + 3 条三角轴层
    expect(root.children.length).toBeGreaterThanOrEqual(4);
  });

  // 交互：ternary × categorical color → 分色子 Scope
  it('ternary_with_color_groups_into_subscopes', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'ordinal', name: 'col', range: ['#aa', '#bb'] }],
      coordinate: { type: 'ternary2D' },
      marks: [{ type: 'point', encoding: { a: { field: 'a' }, b: { field: 'b' }, c: { field: 'c' }, color: { field: 'region', scale: 'col' } } }],
    });
    const layer = firstLayer(spec, { d: [{ a: 1, b: 1, c: 1, region: 'X' }, { a: 2, b: 1, c: 1, region: 'Y' }] }, opts);
    expect(layer.children).toHaveLength(2);
  });
});
