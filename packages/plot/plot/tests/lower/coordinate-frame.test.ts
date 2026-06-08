import type { IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';

/**
 * ADR-01（alpha.9）coordinate frame N 通道泛化 + 位置 encoding 角色化 + 维度校验测试。
 * 经公开 lowerPlots 断言（不戳内部 frame 方法）：
 *   - cartesian / polar 投影逐字不变（frame 加 roles/projectRoles 零回归）；
 *   - 缺必填位置角色 fail-loud（必填性下放 coordinate 级，承 encoding x/y 转可选）；
 *   - guide 维度按坐标系合法集校验、非法 dimension fail-loud（修 cross-review P2）。
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

describe('coordinate frame N 通道泛化回归 (ADR-01)', () => {
  // Happy path：cartesian point 投影逐字不变（projectRoles=[x,y] 包装既有 project）
  it('cartesian_point_projection_unchanged', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'a' }, y: { field: 'b' } } }],
    });
    const rows = [
      { a: 0, b: 0 },
      { a: 2, b: 10 },
    ];
    const positions = positionsOf(firstLayer(spec, { d: rows }, opts));
    // x[0,2]→[0,480]、y[0,10]→[300,0]
    expect(positions[0]).toEqual([0, 300]);
    expect(positions[1]).toEqual([480, 0]);
  });

  // Happy path：polar point 投影逐字不变（projectRoles=[angle,radius] 包装既有极坐标 project）
  it('polar_point_projection_unchanged', () => {
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
      { theta: 0, value: 0 },
      { theta: 0, value: 10 },
    ];
    const [center, rightmost] = positionsOf(firstLayer(spec, { d: rows }, opts));
    expect(rightmost[1]).toBeCloseTo(center[1], 6);
    expect(rightmost[0]).toBeGreaterThan(center[0]);
  });

  // 边界：encoding 只给 x（无 y）在 schema parse 通过（必填性在 lowering）
  it('encoding_x_only_parses', () => {
    expect(() =>
      PlotSpecSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [{ type: 'linear', name: 'x' }],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'x' },
        marks: [{ type: 'point', encoding: { x: { field: 'a' } } }],
      }),
    ).not.toThrow();
  });
});

describe('coordinate 必填角色校验 fail-loud (ADR-01)', () => {
  const cartMissingY = (): PlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'x' },
      marks: [{ type: 'point', encoding: { x: { field: 'a' } } }],
    });

  it('cartesian_missing_y_throws', () => {
    expect(() => expandOf(cartMissingY(), { d: [{ a: 1 }] }, opts)).toThrow(/cartesian2D|requires|y/i);
  });

  it('polar_missing_x_throws', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a' },
        { type: 'linear', name: 'r' },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'point', encoding: { y: { field: 'value' } } }],
    });
    expect(() => expandOf(spec, { d: [{ value: 1 }] }, opts)).toThrow(/polar2D|requires|x/i);
  });
});

describe('guide 维度校验 fail-loud (ADR-01, 修 cross-review P2)', () => {
  // 错误路径：cartesian 下 dimension 'angle' 非法 → fail-loud（曾静默丢弃 / 杂散轴线）
  it('cartesian_angle_dimension_throws', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'a' }, y: { field: 'b' } } }],
      guides: [{ type: 'axis', dimension: 'angle' }],
    });
    expect(() => expandOf(spec, { d: [{ a: 1, b: 2 }] }, opts)).toThrow(/cartesian2D|angle|not support|dimension/i);
  });

  // 错误路径：polar 下 dimension 'b'（ternary 维度）非法 → fail-loud
  it('polar_b_dimension_throws', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a' },
        { type: 'linear', name: 'r' },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'point', encoding: { x: { field: 'theta' }, y: { field: 'value' } } }],
      guides: [{ type: 'axis', dimension: 'b' }],
    });
    expect(() => expandOf(spec, { d: [{ theta: 0, value: 1 }] }, opts)).toThrow(/polar2D|not support|dimension|b/i);
  });

  // 边界：polar 下 x / y 别名 + angle / radius 都合法（alpha.4 别名保留，勿删）
  it('polar_xy_aliases_and_native_dimensions_accepted', () => {
    const makeSpec = (dimension: string): PlotSpec =>
      PlotSpecSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'a' },
          { type: 'linear', name: 'r' },
        ],
        coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
        marks: [{ type: 'point', encoding: { x: { field: 'theta' }, y: { field: 'value' } } }],
        guides: [{ type: 'axis', dimension }],
      });
    for (const dim of ['angle', 'radius', 'x', 'y']) {
      expect(() => expandOf(makeSpec(dim), { d: [{ theta: 0, value: 1 }] }, opts)).not.toThrow();
    }
  });

  // 交互：cartesian x/y 合法 + grid（非法维度抛、不渲杂散网格线）
  it('cartesian_xy_dimensions_with_grid_accepted', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'a' }, y: { field: 'b' } } }],
      guides: [
        { type: 'axis', dimension: 'x', grid: true },
        { type: 'axis', dimension: 'y' },
      ],
    });
    expect(() => expandOf(spec, { d: [{ a: 1, b: 2 }] }, opts)).not.toThrow();
  });
});
