import type { IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import { lowerPlot } from '../../../src/pipeline/expand/lower';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

/**
 * Coordinate frame N 通道泛化、位置 encoding 角色化与维度校验测试。
 * 经公开 lowerPlots 断言（不戳内部 frame 方法）：
 *   - cartesian / polar 投影逐字不变（frame 加 roles/projectRoles 零回归）；
 *   - 缺必填位置角色 fail-loud（必填性下放 coordinate 级，承 encoding x/y 转可选）；
 *   - guide 维度按坐标系合法集校验，非法 dimension fail-loud
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

const expandOf = (spec: IRPlot, datasets: Datasets, options?: LowerPlotsOptions): IRScope => {
  return lowerPlot(spec, datasets, { ...options, textMeasurer: measureLabel }) as IRScope;
};

const firstLayer = (spec: IRPlot, datasets: Datasets, options?: LowerPlotsOptions): IRScope =>
  expandOf(spec, datasets, options).children[0] as IRScope;

const positionsOf = (layer: IRScope): Array<[number, number]> =>
  layer.children.map(child => (child as IRNode).position as [number, number]);

const opts: LowerPlotsOptions = { layout: { width: 480, height: 300 } };

describe('coordinate frame N 通道泛化回归 (contract)', () => {
  // Happy path：cartesian point 投影逐字不变（projectRoles=[x,y] 包装既有 project）
  it('笛卡尔点投影不变', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'a' }, y: { field: 'b' } } } }],
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
  it('极坐标点投影不变', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a', domainPadding: 0, domain: [0, 360] },
        { type: 'linear', name: 'r', domainPadding: 0, domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'theta' }, y: { field: 'value' } } } }],
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
  it('编码 x 仅解析', () => {
    expect(() =>
      PlotSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [{ type: 'linear', name: 'x', domainPadding: 0 }],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'x' },
        marks: [{ type: 'point', encodings: { position: { x: { field: 'a' } } } }],
      }),
    ).not.toThrow();
  });
});

describe('coordinate 必填角色校验 fail-loud (contract)', () => {
  const cartMissingY = (): IRPlot =>
    PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x', domainPadding: 0 }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'x' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'a' } } } }],
    });

  it('笛卡尔缺失 y 抛出', () => {
    expect(() => expandOf(cartMissingY(), { d: [{ a: 1 }] }, opts)).toThrow(/cartesian2D|requires|y/i);
  });

  it('极坐标缺少 x 时抛出错误', () => {
    expect(() =>
      PlotSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'a', domainPadding: 0 },
          { type: 'linear', name: 'r', domainPadding: 0 },
        ],
        coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
        marks: [{ type: 'point', encodings: { position: { y: { field: 'value' } } } }],
      }),
    ).toThrow();
  });
});

describe('guide 维度校验 fail-loud', () => {
  // 错误路径：cartesian 下 dimension 'angle' 非法 → fail-loud（曾静默丢弃 / 杂散轴线）
  it('坐标定义角色拒绝 angle 维度', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'a' }, y: { field: 'b' } } } }],
      guides: [{ type: 'axis', dimension: 'angle' }],
    });

    expect(() => expandOf(spec, { d: [{ a: 0, b: 0 }] }, opts)).toThrow(/does not support axis dimension "angle"/);
  });

  // 错误路径：cartesian 下 dimension 'radius'（polar 维度）非法 → fail-loud
  it('坐标定义角色拒绝 radius 维度', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'a' }, y: { field: 'b' } } } }],
      guides: [{ type: 'axis', dimension: 'radius' }],
    });

    expect(() => expandOf(spec, { d: [{ a: 0, b: 0 }] }, opts)).toThrow(/does not support axis dimension "radius"/);
  });

  it('坐标定义角色拒绝未知编码角色', () => {
    expect(() =>
      PlotSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'x', domainPadding: 0 },
          { type: 'linear', name: 'y', domainPadding: 0 },
        ],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
        marks: [
          { type: 'point', encodings: { position: { x: { field: 'a' }, y: { field: 'b' }, size: { field: 's' } } } },
        ],
      }),
    ).toThrow();
  });

  // 边界：polar 下 x / y 合法；x 是角向，y 是径向
  it('极坐标接受 x、y 维度', () => {
    const makeSpec = (dimension: string): IRPlot =>
      PlotSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'a', domainPadding: 0 },
          { type: 'linear', name: 'r', domainPadding: 0 },
        ],
        coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
        marks: [{ type: 'point', encodings: { position: { x: { field: 'theta' }, y: { field: 'value' } } } }],
        guides: [{ type: 'axis', dimension }],
      });

    for (const dim of ['x', 'y']) {
      expect(() => expandOf(makeSpec(dim), { d: [{ theta: 0, value: 1 }] }, opts)).not.toThrow();
    }
  });

  // 交互：cartesian x/y 合法 + grid（非法维度抛、不渲杂散网格线）
  it('笛卡尔 xy 尺寸，接受网格', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'a' }, y: { field: 'b' } } } }],
      guides: [
        { type: 'axis', dimension: 'x', grid: true },
        { type: 'axis', dimension: 'y' },
      ],
    });

    expect(() => expandOf(spec, { d: [{ a: 1, b: 2 }] }, opts)).not.toThrow();
  });
});
