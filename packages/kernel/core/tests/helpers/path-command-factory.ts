import type {
  ArcPathCommand,
  ClosePathCommand,
  CubicPathCommand,
  EllipseArcPathCommand,
  LinePathCommand,
  MovePathCommand,
  QuadPathCommand,
} from '../../src/contract';

/**
 * 测试 helper：PathCommand 工厂
 * @description 只产结构化 PathCommand 对象、绝不产 SVG 字符串。给 core 测试断言用，避免再写 mirror renderer 的字符串拼装
 */

export const move = (to: [number, number]): MovePathCommand => ({ kind: 'move', to });

/** 创建到指定终点的直线路径测试命令 */
export const line = (to: [number, number]): LinePathCommand => ({ kind: 'line', to });

/** 创建包含一个控制点的二次贝塞尔测试命令 */
export const quad = (control: [number, number], to: [number, number]): QuadPathCommand => ({
  kind: 'quad',
  control,
  to,
});

/** 创建包含两个控制点的三次贝塞尔测试命令 */
export const cubic = (
  control1: [number, number],
  control2: [number, number],
  to: [number, number],
): CubicPathCommand => ({ kind: 'cubic', control1, control2, to });

/** 创建圆弧测试命令，仅在提供时写入逆时针标记 */
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

/** 创建椭圆弧测试命令，仅在提供时写入旋转及逆时针标记 */
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

/** 创建闭合当前子路径的测试命令 */
export const close = (): ClosePathCommand => ({ kind: 'close' });
