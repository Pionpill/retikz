import type { Position } from '@retikz/math';

import type { ContourCommand, LineSegment } from '../../shared';
import type { PathCommand, PathPrim } from '../scene';
import type { ResolvedShapeStyle } from './types';

/** 将顶点环变换为闭合线段，供形状定义复用 */
export const verticesToSegments = (vertices: Array<Position>): Array<LineSegment> =>
  vertices.map((from, index) => ({ kind: 'line', from, to: vertices[(index + 1) % vertices.length] }));

/** 将共享轮廓命令转换为 Scene path 命令 */
export const contourToPathCommands = (
  commands: Array<ContourCommand>,
  round: (value: number) => number,
): Array<PathCommand> => {
  const roundPoint = (point: Position): [number, number] => [round(point[0]), round(point[1])];
  const output: Array<PathCommand> = [];
  let moveTo: [number, number] | undefined;
  commands.forEach((command, index) => {
    switch (command.kind) {
      case 'move': {
        moveTo = roundPoint(command.to);
        output.push({ kind: 'move', to: moveTo });
        break;
      }
      case 'line': {
        const to = roundPoint(command.to);
        const nextIsClose = index + 1 < commands.length && commands[index + 1]?.kind === 'close';
        if (nextIsClose && moveTo !== undefined && to[0] === moveTo[0] && to[1] === moveTo[1]) break;
        output.push({ kind: 'line', to });
        break;
      }
      case 'arc':
        output.push({
          kind: 'arc',
          center: roundPoint(command.center),
          radius: round(command.radius),
          startAngle: command.startAngle,
          endAngle: command.endAngle,
          ...(command.counterClockwise === undefined ? {} : { counterClockwise: command.counterClockwise }),
        });
        break;
      case 'close':
        output.push({ kind: 'close' });
        break;
    }
  });
  return output;
};

type ShapeStylePassthrough = Omit<ResolvedShapeStyle, 'fill' | 'stroke' | 'strokeWidth'>;

type PathPrimitiveStyle = Pick<
  PathPrim,
  | 'fill'
  | 'fillOpacity'
  | 'stroke'
  | 'strokeOpacity'
  | 'strokeWidth'
  | 'dashPattern'
  | 'dashOffset'
  | 'opacity'
  | 'shadow'
  | 'blendMode'
>;

/** 把形状样式投影到路径图元，忽略只属于节点盒的 cornerRadius */
export const pathPrimitiveStyle = (
  style: ResolvedShapeStyle,
  options?: Readonly<{ fill?: PathPrim['fill'] }>,
): PathPrimitiveStyle => {
  const { fill, stroke, strokeWidth, cornerRadius: _cornerRadius, ...passthroughStyle } = style;
  void _cornerRadius;
  return {
    ...(passthroughStyle as ShapeStylePassthrough),
    fill: options?.fill ?? fill ?? 'transparent',
    stroke: stroke ?? 'currentColor',
    strokeWidth: strokeWidth ?? 1,
  };
};

/** 将已转换的轮廓命令与形状样式组合为路径图元 */
export const contourToPathPrimitive = (commands: Array<PathCommand>, style: ResolvedShapeStyle): PathPrim => ({
  type: 'path',
  commands,
  ...pathPrimitiveStyle(style),
});
