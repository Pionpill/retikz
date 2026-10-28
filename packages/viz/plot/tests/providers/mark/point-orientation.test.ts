import type { IRChild, IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import type { CoordinateFrame, ScreenPositionAdjustmentDefinition } from '../../../src/contract';
import { createCoordinateFrame, defineCoordinate } from '../../../src/contract';
import type { PlotsLoweringOptions } from '../../../src/pipeline/expand';
import { lowerPlotWithDataArtifact } from '../../../src/pipeline/expand/lower';
import type { IRPlotPointMark } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

const nodesOf = (child: IRChild): Array<IRNode> => {
  if (child.type === 'node') return [child as IRNode];
  if (child.type === 'scope') return (child as IRScope).children.flatMap(nodesOf);
  return [];
};

const render = (
  extra: Partial<IRPlotPointMark> = {},
  coordinate: Record<string, unknown> = { type: 'polar2D', angle: 'x', radius: 'y', startAngle: 0, endAngle: 360 },
  options: PlotsLoweringOptions = {},
  rows = [{ angle: 90, radius: 50, rotation: 15, text: 'A' }],
) => {
  const spec = PlotSchema.parse({
    type: 'plot',
    namespace: 'plot',
    data: { reference: 'd' },
    coordinate,
    scales: [
      { type: 'linear', name: 'x', domain: [0, 360], range: [0, 360] },
      { type: 'linear', name: 'y', domain: [0, 100], range: [0, 100] },
    ],
    marks: [
      {
        type: 'point',
        ...extra,
        encodings: { position: { x: { field: 'angle' }, y: { field: 'radius' } }, ...extra.encodings },
        properties: { autoPadding: false, ...extra.properties },
      },
    ],
    guides: [],
  });
  return nodesOf(
    lowerPlotWithDataArtifact(
      spec,
      { d: rows },
      {
        layout: { width: 300, height: 300 },
        ...options,
        textMeasurer: measureLabel,
      },
    ).child,
  );
};

describe('PointMark 坐标方向', () => {
  it('沿角向切线及正法向旋转，并叠加常量角', () => {
    expect(
      render({ properties: { orientation: { kind: 'coordinate', role: 'x', align: 'tangent' }, rotate: 15 } })[0]
        .rotate,
    ).toBeCloseTo(195);
    expect(
      render({ properties: { orientation: { kind: 'coordinate', role: 'x', align: 'normal' } } })[0].rotate,
    ).toBeCloseTo(270);
    expect(
      render({ properties: { orientation: { kind: 'coordinate', role: 'y', align: 'tangent' } } })[0].rotate,
    ).toBeCloseTo(90);
  });

  it('文本使用同一方向与字段旋转通道', () => {
    expect(
      render({
        encodings: { text: 'text', position: { x: { field: 'angle' }, y: { field: 'radius' } }, rotate: 'rotation' },
        properties: { orientation: { kind: 'coordinate', role: 'x', align: 'tangent' } },
      })[0].rotate,
    ).toBeCloseTo(195);
  });

  it('默认与显式屏幕方向等价，不额外旋转', () => {
    expect(render()).toEqual(render({ properties: { orientation: { kind: 'screen' } } }));
  });

  it('屏幕偏移只移动文本，不改变方向', () => {
    const extra: Partial<IRPlotPointMark> = {
      encodings: { text: 'text', position: { x: { field: 'angle' }, y: { field: 'radius' } } },
      properties: { orientation: { kind: 'coordinate', role: 'x', align: 'tangent' } },
    };
    const original = render(extra)[0];
    const offset = render({ ...extra, properties: { ...extra.properties, dx: 20, dy: 10 } })[0];
    expect(offset.rotate).toEqual(original.rotate);
    expect(offset.position).not.toEqual(original.position);
  });

  it('未知角色明确失败', () => {
    expect(() =>
      render({ properties: { orientation: { kind: 'coordinate', role: 'missing', align: 'tangent' } } }),
    ).toThrow(/orientation.*missing/i);
  });

  it('屏幕空间调整移动节点但保留方向参考参数', () => {
    const nudge: ScreenPositionAdjustmentDefinition<{ kind: 'nudge' }> = {
      space: 'screen',
      schema: strictObject({ kind: literal('nudge') }),
      initialize: (_operation, context) =>
        context.targets.map(target => ({
          key: target.key,
          position: target.position && [target.position[0] + 80, target.position[1] - 25],
        })),
    };
    const orientation = { kind: 'coordinate', role: 'y', align: 'tangent' } as const;
    const base = render({ properties: { orientation } })[0];
    const shifted = render(
      { properties: { orientation, placement: { adjustments: [{ kind: 'nudge' }] } } },
      undefined,
      {
        definitions: { positionAdjustments: [nudge] },
      },
    )[0];
    const position = base.position as [number, number];
    expect(shifted.position).toEqual([position[0] + 80, position[1] - 25]);
    expect(shifted.rotate).toEqual(base.rotate);
  });

  it('不可投影行跳过后仍使用对应目标的方向与字段角', () => {
    const nodes = render(
      {
        encodings: { rotate: 'rotation' },
        properties: {
          orientation: { kind: 'coordinate', role: 'y', align: 'tangent' },
          placement: { adjustments: [{ kind: 'jitter', role: 'x', span: 0, seed: 1 }] },
        },
      },
      undefined,
      {},
      [
        { angle: NaN, radius: 50, rotation: 0, text: 'skip' },
        { angle: 90, radius: 50, rotation: 15, text: 'A' },
        { angle: 180, radius: 50, rotation: 25, text: 'B' },
      ],
    );
    expect(nodes).toHaveLength(2);
    expect(nodes[0].rotate).toBeCloseTo(105);
    expect(nodes[1].rotate).toBeCloseTo(205);
  });

  it('角色抖动后的朝向与实际圆周位置一致', () => {
    const node = render({
      properties: {
        orientation: { kind: 'coordinate', role: 'y', align: 'tangent' },
        placement: { adjustments: [{ kind: 'jitter', role: 'x', span: 80, seed: 3 }] },
      },
    })[0];
    const original = render()[0].position as [number, number];
    const position = node.position as [number, number];
    // 对称绘图区的圆心为 [150,150]，径向基准随抖动后的投影改变
    expect(position).not.toEqual(original);
    expect(node.rotate).toBeCloseTo((Math.atan2(position[1] - 150, position[0] - 150) * 180) / Math.PI);
  });

  it('圆心角向不确定时失败，径向仍由角参数决定', () => {
    const rows = [{ angle: 90, radius: 0, rotation: 0, text: 'A' }];
    const coordinate = { type: 'polar2D', angle: 'x', radius: 'y', startAngle: 0, endAngle: 360, innerRadius: 0 };
    expect(() =>
      render(
        { properties: { orientation: { kind: 'coordinate', role: 'x', align: 'tangent' } } },
        coordinate,
        {},
        rows,
      ),
    ).toThrow(/orientation.*target/);
    expect(
      render(
        { properties: { orientation: { kind: 'coordinate', role: 'y', align: 'tangent' } } },
        coordinate,
        {},
        rows,
      )[0].rotate,
    ).toBeCloseTo(90);
  });

  const custom = (tangentAt?: CoordinateFrame['tangentAt']) =>
    defineCoordinate({
      schema: strictObject({ type: literal('skew') }),
      roles: ['x', 'y'],
      resolve: () => ({
        frame: createCoordinateFrame(
          'skew',
          ['x', 'y'],
          values => [Number(values[0]) + Number(values[1]), Number(values[1])],
          {
            mapRoles: values => (values.every(value => Number.isFinite(Number(value))) ? values.map(Number) : null),
            projectMappedRoles: values => [values[0] + values[1], values[1]],
            tangentAt,
          },
        ),
        plotArea: { x: 0, y: 0, width: 300, height: 300 },
        gridLayers: [],
        axisLayers: [],
      }),
    });

  it('自定义斜交坐标的正法向不等于另一角色切向', () => {
    const options = { definitions: { coordinates: [custom(role => (role === 'x' ? [1, 0] : [1, 1]))] } };
    const normal = render(
      { properties: { orientation: { kind: 'coordinate', role: 'x', align: 'normal' } } },
      { type: 'skew' },
      options,
    )[0];
    const other = render(
      { properties: { orientation: { kind: 'coordinate', role: 'y', align: 'tangent' } } },
      { type: 'skew' },
      options,
    )[0];
    expect(normal.rotate).toBe(90);
    expect(other.rotate).toBe(45);
  });

  it('缺少坐标方向能力仅在显式请求时失败', () => {
    const options = { definitions: { coordinates: [custom()] } };
    expect(render({}, { type: 'skew' }, options)).toHaveLength(1);
    expect(() =>
      render(
        { properties: { orientation: { kind: 'coordinate', role: 'x', align: 'tangent' } } },
        { type: 'skew' },
        options,
      ),
    ).toThrow(/tangentAt/);
  });

  it('外部方向回调失败保留原因并标明目标', () => {
    const cause = new Error('external direction failure');
    const options = {
      definitions: {
        coordinates: [
          custom(() => {
            throw cause;
          }),
        ],
      },
    };
    expect(() =>
      render(
        { properties: { orientation: { kind: 'coordinate', role: 'x', align: 'tangent' } } },
        { type: 'skew' },
        options,
      ),
    ).toThrow(expect.objectContaining({ cause, message: expect.stringContaining('target "0"') }));
  });

  it.each([null, [0, 0], [Infinity, 1]] as const)('无效方向 %s 不回退至屏幕方向', tangent => {
    const options = {
      definitions: { coordinates: [custom(() => (tangent === null ? null : [tangent[0], tangent[1]]))] },
    };
    expect(() =>
      render(
        { properties: { orientation: { kind: 'coordinate', role: 'x', align: 'normal' } } },
        { type: 'skew' },
        options,
      ),
    ).toThrow(/orientation.*target/);
  });
});
