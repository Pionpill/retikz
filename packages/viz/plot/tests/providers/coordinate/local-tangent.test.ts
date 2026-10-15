import { describe, expect, it } from 'vitest';

import {
  createCartesianCoordinate,
  createCartesian1DCoordinate,
  createPolarCoordinate,
  createPolar1DCoordinate,
  linearPositionScale,
  resolveLinearScale,
} from '../../../src/providers';
import type { PolarCoordinateInput } from '../../../src/providers';

const scale = linearPositionScale(
  resolveLinearScale({ type: 'linear', name: 'x', domain: [0, 360] }, [0, 360], [0, 360]),
);
const polarInput: PolarCoordinateInput = {
  center: [0, 0],
  innerRadius: 0,
  outerRadius: 100,
  startAngle: 0,
  endAngle: 360,
  interpolation: 'chord',
  angularSkeleton: [0, 90, 180, 270],
  primary: { ...scale, step: 90 },
  secondary: scale,
};

describe('mapped-role local tangent', () => {
  it('直角坐标方向来自映射后参数，与数据 scale 顺序无关', () => {
    const reversed = linearPositionScale(
      resolveLinearScale({ type: 'linear', name: 'r', domain: [0, 360] }, [0, 360], [360, 0]),
    );
    expect(createCartesianCoordinate(reversed, scale).tangentAt?.('x', [90, 50])).toEqual([1, 0]);
    expect(createCartesian1DCoordinate(scale, 'vertical', 0).tangentAt?.('x', [20])).toEqual([0, 1]);
    expect(createCartesian1DCoordinate(scale, 'horizontal', 0).tangentAt?.('x', [20])).toEqual([1, 0]);
  });

  it('一维极坐标与二维圆弧方向一致，圆心角向无定义', () => {
    const frame = createPolar1DCoordinate({
      center: [0, 0],
      radius: 10,
      startAngle: 0,
      endAngle: 360,
      continuousAngle: true,
      primary: scale,
    });
    expect(frame.tangentAt?.('x', [90])?.[0]).toBeCloseTo(-10);
    expect(frame.tangentAt?.('x', [90])?.[1]).toBeCloseTo(0);
    expect(createPolarCoordinate({ ...polarInput, interpolation: 'polar' }).tangentAt?.('x', [90, 0])).toBeNull();
  });

  it('chord 段内使用弦切向，顶点与闭合接缝不冒充圆弧方向', () => {
    const frame = createPolarCoordinate(polarInput);
    const tangent = frame.tangentAt?.('x', [30, 50]);
    expect(tangent?.[0]).toBeCloseTo(-Math.SQRT1_2);
    expect(tangent?.[1]).toBeCloseTo(Math.SQRT1_2);
    expect(frame.tangentAt?.('x', [90, 50])).toBeNull();
    expect(frame.tangentAt?.('x', [0, 50])).toBeNull();
    const radial = frame.tangentAt?.('y', [30, 50]);
    expect(radial?.[0]).toBeCloseTo(2 / 3);
    expect(radial?.[1]).toBeCloseTo(1 / 3);
  });

  it('反向 sweep 仍按映射后角参数递增定义方向', () => {
    const frame = createPolarCoordinate({
      ...polarInput,
      startAngle: 360,
      endAngle: 0,
      angularSkeleton: [360, 270, 180, 90],
    });
    expect(frame.tangentAt?.('x', [30, 50])?.[0]).toBeCloseTo(-Math.SQRT1_2);
    expect(frame.tangentAt?.('x', [30, 50])?.[1]).toBeCloseTo(Math.SQRT1_2);
  });
});
