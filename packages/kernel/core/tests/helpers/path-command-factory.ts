import type {
  ArcPathCommand,
  ClosePathCommand,
  CubicPathCommand,
  EllipseArcPathCommand,
  LinePathCommand,
  MovePathCommand,
  QuadPathCommand,
} from '../../src/primitive';

/**
 * 测试 helper：PathCommand 工厂
 * @description 只产结构化 PathCommand 对象、绝不产 SVG 字符串。给 core 测试断言用，避免再写 mirror renderer 的字符串拼装
 */

export const move = (to: [number, number]): MovePathCommand => ({ kind: 'move', to });

export const line = (to: [number, number]): LinePathCommand => ({ kind: 'line', to });

export const quad = (
  control: [number, number],
  to: [number, number],
): QuadPathCommand => ({ kind: 'quad', control, to });

export const cubic = (
  control1: [number, number],
  control2: [number, number],
  to: [number, number],
): CubicPathCommand => ({ kind: 'cubic', control1, control2, to });

export const arc = (
  center: [number, number],
  radius: number,
  startAngle: number,
  endAngle: number,
  counterClockwise?: boolean,
): ArcPathCommand => {
  const cmd: ArcPathCommand = { kind: 'arc', center, radius, startAngle, endAngle };
  if (counterClockwise !== undefined) cmd.counterClockwise = counterClockwise;
  return cmd;
};

export const ellipseArc = (
  center: [number, number],
  radiusX: number,
  radiusY: number,
  startAngle: number,
  endAngle: number,
  rotation?: number,
  counterClockwise?: boolean,
): EllipseArcPathCommand => {
  const cmd: EllipseArcPathCommand = {
    kind: 'ellipseArc',
    center,
    radiusX,
    radiusY,
    startAngle,
    endAngle,
  };
  if (rotation !== undefined) cmd.rotation = rotation;
  if (counterClockwise !== undefined) cmd.counterClockwise = counterClockwise;
  return cmd;
};

export const close = (): ClosePathCommand => ({ kind: 'close' });
