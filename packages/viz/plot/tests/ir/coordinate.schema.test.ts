import { describe, expect, it } from 'vitest';

import {
  BUILTIN_COORDINATE_TYPES,
  CoordinateOperationSchema,
  CoordinateSchema,
  CustomCoordinateSchema,
  BuiltinPlotCoordinate,
  PolarInterpolation,
} from '../../src/schemas/coordinate';

describe('CoordinateSchema（契约）', () => {
  // Happy path
  it('接受 cartesian2d 坐标配置', () => {
    const c = { type: 'cartesian2D', x: 'xs', y: 'ys' };

    expect(CoordinateSchema.parse(c)).toEqual(c);
  });

  // 边界
  it('拒绝坐标配置中的空 x', () => {
    expect(() => CoordinateSchema.parse({ type: 'cartesian2D', x: '', y: 'ys' })).toThrow();
  });

  // contract：x/y 绑定改为可选（缺省按字段类型派生），故「省略」由 reject 变为 accept
  it('坐标配置省略 x 时可推导', () => {
    expect(() => CoordinateSchema.parse({ type: 'cartesian2D', y: 'ys' })).not.toThrow();
  });

  it('坐标配置省略 y 时可推导', () => {
    expect(() => CoordinateSchema.parse({ type: 'cartesian2D', x: 'xs' })).not.toThrow();
  });

  it('坐标配置同时省略 x 和 y 时可推导', () => {
    expect(() => CoordinateSchema.parse({ type: 'cartesian2D' })).not.toThrow();
  });

  it('极坐标忽略笛卡尔坐标键', () => {
    // polar2D 不识别 x/y（被 zod 剥离），angle/radius 可省 → 解析成 polar2D
    expect(CoordinateSchema.parse({ type: 'polar2D', x: 'xs', y: 'ys' }).type).toBe('polar2D');
  });

  // 交互：schema 层不做跨字段引用校验（引用完整性归 lowering）
  it('引用未知比例尺名称的坐标配置通过 schema 校验', () => {
    const c = { type: 'cartesian2D', x: 'nonexistent', y: 'alsoMissing' };

    expect(CoordinateSchema.parse(c)).toEqual(c);
  });
});

describe('CoordinateSchema Polar2D（契约）', () => {
  // Happy path
  it('polar2d 解析实现静态默认值', () => {
    const parsed = CoordinateSchema.parse({ type: 'polar2D', angle: 'a', radius: 'r' });

    expect(parsed).toEqual({ type: 'polar2D', angle: 'a', radius: 'r', startAngle: 0, endAngle: 360, innerRadius: 0 });
  });

  it('polar2d 显式字段有效', () => {
    const c = { type: 'polar2D', angle: 'a', radius: 'r', startAngle: -90, endAngle: 180, innerRadius: 0.3 };

    expect(CoordinateSchema.parse(c)).toEqual(c);
  });

  it.each(Object.values(PolarInterpolation))('polar2d 的 %s 插值配置保持往返等价', interpolation => {
    const coordinate = {
      type: 'polar2D',
      angle: 'a',
      radius: 'r',
      interpolation,
    };

    const parsed = CoordinateSchema.parse(coordinate);

    expect(parsed).toEqual({ ...coordinate, startAngle: 0, endAngle: 360, innerRadius: 0 });
    expect(CoordinateSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('polar2d 未知插值被拒绝', () => {
    expect(() =>
      CoordinateSchema.parse({
        type: 'polar2D',
        interpolation: 'spline',
      }),
    ).toThrow();
  });

  it('polar2d 笛卡尔仍然接受回归', () => {
    // 回归：扩 union 后 cartesian2D 仍接受、产物不变
    const c = { type: 'cartesian2D', x: 'xs', y: 'ys' };

    expect(CoordinateSchema.parse(c)).toEqual(c);
  });

  // 边界
  it('polar2d innerRadius 在下限有效', () => {
    const c = { type: 'polar2D', angle: 'a', radius: 'r', innerRadius: 0 } as const;
    const parsed = CoordinateSchema.parse(c);

    expect(parsed.type === 'polar2D' && parsed.innerRadius).toBe(0);
  });

  it('polar2d innerRadius 之一被拒绝', () => {
    // innerRadius 是占外半径比例，必须 < 1（.lt(1)）
    expect(() => CoordinateSchema.parse({ type: 'polar2D', angle: 'a', radius: 'r', innerRadius: 1 })).toThrow();
  });

  it('polar2d innerRadius 以上一项被拒绝', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar2D', angle: 'a', radius: 'r', innerRadius: 1.5 })).toThrow();
  });

  it('polar2d innerRadius 负值被拒绝', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar2D', angle: 'a', radius: 'r', innerRadius: -0.1 })).toThrow();
  });

  // 错误路径
  it('接受的 Polar2d 缺失角度推导', () => {
    // contract：angle/radius 绑定可省（派生）
    expect(() => CoordinateSchema.parse({ type: 'polar2D', radius: 'r' })).not.toThrow();
  });

  it('polar2d 缺少已接受的半径', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar2D', angle: 'a' })).not.toThrow();
  });

  it('polar2d 空角被拒绝', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar2D', angle: '', radius: 'r' })).toThrow();
  });

  // 错误路径：非有限角度破坏 JSON 可序列化（Infinity → JSON null），必须拒（Bug Hunter B-1）
  it('polar2d startAngle 无穷大被拒绝', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar2D', angle: 'a', radius: 'r', startAngle: Infinity })).toThrow();
    expect(() => CoordinateSchema.parse({ type: 'polar2D', angle: 'a', radius: 'r', startAngle: -Infinity })).toThrow();
  });

  it('polar2d endAngle 无穷大被拒绝', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar2D', angle: 'a', radius: 'r', endAngle: Infinity })).toThrow();
  });

  // round-trip：IR 必须 100% JSON 可序列化
  it('polar2d json 往返', () => {
    const ir = CoordinateSchema.parse({
      type: 'polar2D',
      angle: 'a',
      radius: 'r',
      startAngle: -90,
      endAngle: 270,
      innerRadius: 0.25,
    });

    expect(CoordinateSchema.parse(JSON.parse(JSON.stringify(ir)))).toEqual(ir);
  });
});

describe('CoordinateSchema 一维坐标系族 cartesian1D / polar1D (contract)', () => {
  // Happy path：cartesian1D
  it('接受 cartesian1d 最小配置', () => {
    const c = { type: 'cartesian1D', x: 'xs' };

    expect(CoordinateSchema.parse(c)).toEqual(c);
  });

  it('cartesian1d 裸类型有效派生', () => {
    // x 可省（派生）、orientation 可省（lowering 默认 horizontal，schema 不填默认）
    expect(CoordinateSchema.parse({ type: 'cartesian1D' })).toEqual({ type: 'cartesian1D' });
  });

  it('笛卡尔 1d 垂直方向有效', () => {
    const c = { type: 'cartesian1D', x: 'xs', orientation: 'vertical' };

    expect(CoordinateSchema.parse(c)).toEqual(c);
  });

  it('笛卡尔 1d 方向错误被拒绝', () => {
    expect(() => CoordinateSchema.parse({ type: 'cartesian1D', orientation: 'diagonal' })).toThrow();
  });

  // Happy path：polar1D
  it('接受 polar1d 最小配置', () => {
    const c = { type: 'polar1D', angle: 'a' };

    expect(CoordinateSchema.parse(c)).toEqual(c);
  });

  it('polar1d 显式字段有效', () => {
    const c = { type: 'polar1D', angle: 'a', radius: 0.5, startAngle: 180, endAngle: 360 };

    expect(CoordinateSchema.parse(c)).toEqual(c);
  });

  // 边界：radius 占比 0<r≤1
  it('接受 polar1d 半径为 1', () => {
    expect(CoordinateSchema.parse({ type: 'polar1D', angle: 'a', radius: 1 })).toEqual({
      type: 'polar1D',
      angle: 'a',
      radius: 1,
    });
  });

  it('拒绝 polar1d 半径为零', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar1D', angle: 'a', radius: 0 })).toThrow();
  });

  it('上面的 1d 半径被拒绝', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar1D', angle: 'a', radius: 1.5 })).toThrow();
  });

  // 错误路径：非有限角度破坏 JSON 可序列化
  it('极性 1d startAngle 无穷大被拒绝', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar1D', angle: 'a', startAngle: Infinity })).toThrow();
  });

  it('拒绝 polar1d 半径为无穷大', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar1D', angle: 'a', radius: Infinity })).toThrow();
  });

  it('极性 1d 空角被拒绝', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar1D', angle: '' })).toThrow();
  });

  // 回归：扩 union 后 cartesian2D / polar2D 仍接受
  it('二维坐标配置仍可正常使用', () => {
    expect(CoordinateSchema.parse({ type: 'cartesian2D', x: 'x', y: 'y' }).type).toBe('cartesian2D');
    expect(CoordinateSchema.parse({ type: 'polar2D', angle: 'a', radius: 'r' }).type).toBe('polar2D');
  });

  // round-trip
  it('cartesian1d json 往返', () => {
    const ir = CoordinateSchema.parse({ type: 'cartesian1D', x: 'xs', orientation: 'vertical' });

    expect(CoordinateSchema.parse(JSON.parse(JSON.stringify(ir)))).toEqual(ir);
  });

  it('polar1d json 往返', () => {
    const ir = CoordinateSchema.parse({ type: 'polar1D', angle: 'a', radius: 0.8, startAngle: 90, endAngle: 270 });

    expect(CoordinateSchema.parse(JSON.parse(JSON.stringify(ir)))).toEqual(ir);
  });
});

describe('CoordinateOperationSchema coordinate registry 占位（contract）', () => {
  it('CoordinateSchema 保持内置 4-union，不接收旧 custom 判别', () => {
    expect(Object.values(BuiltinPlotCoordinate)).toEqual(['cartesian2D', 'polar2D', 'cartesian1D', 'polar1D']);
    expect([...BUILTIN_COORDINATE_TYPES].sort()).toEqual(['cartesian1D', 'cartesian2D', 'polar1D', 'polar2D'].sort());
    expect(() => CoordinateSchema.parse({ type: 'custom', name: 'arch', roles: ['x'] })).toThrow();
  });

  it('自定义 coordinate operation 直接用自有 type 串并透传配置', () => {
    const operation = { type: 'arch', x: 'xScale', archHeight: 30, label: 'bridge' };

    expect(CoordinateOperationSchema.parse(operation)).toEqual(operation);
  });

  it('CoordinateOperationSchema 内置 type 仍走精确 schema 校验，不被自定义开放配置吞掉', () => {
    expect(() => CoordinateOperationSchema.parse({ type: 'cartesian2D', x: 1, y: 'ys' })).toThrow();
    expect(() =>
      CoordinateOperationSchema.parse({ type: 'polar2D', angle: 'a', radius: 'r', innerRadius: 2 }),
    ).toThrow();
  });

  it('自定义 coordinate type 不能撞内置或旧 custom 保留字', () => {
    expect(() => CoordinateOperationSchema.parse({ type: 'custom', name: 'arch', roles: ['x'] })).toThrow();
    expect(() => CoordinateOperationSchema.parse({ type: '' })).toThrow();
  });

  it('自定义 coordinate operation JSON round-trip 不丢字段', () => {
    const operation = { type: 'arch', x: 'xScale', archHeight: 30, nested: { curve: 'sine' } };

    expect(CoordinateOperationSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('[adversarial] 自定义 coordinate operation 拒绝非 JSON 配置值', () => {
    expect(CustomCoordinateSchema.safeParse({ type: 'arch', project: () => [0, 0] }).success).toBe(false);
    expect(CustomCoordinateSchema.safeParse({ type: 'arch', extra: undefined }).success).toBe(false);
    expect(CustomCoordinateSchema.safeParse({ type: 'arch', archHeight: Number.NaN }).success).toBe(false);
    expect(CustomCoordinateSchema.safeParse({ type: 'arch', archHeight: Infinity }).success).toBe(false);
  });

  it('把自定义 coordinate 的非法 JSON 叶子定位到实际字段', () => {
    const result = CustomCoordinateSchema.safeParse({
      type: 'arch',
      payload: { nested: [0, { bad: () => [0, 0] }] },
    });

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues.at(0)?.path).toEqual(['payload']);
  });
});
