import type { Position } from '@retikz/math';

import type { PathCommand, PathPrim, ResolvedShapeStyle } from '../../contract';
import type { ContourCommand, LineSegment } from '../../shared';

import { pathPrimitiveStyle } from './style';

/**
 * 由顶点环构造闭合折线段序列
 * @description 接缝顺序跟随顶点顺序，供圆角轮廓 helper 复用
 */
export const verticesToSegments = (verts: Array<Position>): Array<LineSegment> =>
  verts.map((from, i) => ({ kind: 'line', from, to: verts[(i + 1) % verts.length] }));

/**
 * contour 命令转 path 命令
 * @description 过滤 close 前回到起点的冗余 line，保持无圆角输出简洁
 */
export const contourToPathCommands = (
  commands: Array<ContourCommand>,
  round: (n: number) => number,
): Array<PathCommand> => {
  const rp = (p: Position): [number, number] => [round(p[0]), round(p[1])];
  const out: Array<PathCommand> = [];
  let moveTo: [number, number] | undefined;
  commands.forEach((cmd, i) => {
    switch (cmd.kind) {
      case 'move': {
        moveTo = rp(cmd.to);
        out.push({ kind: 'move', to: moveTo });
        break;
      }
      case 'line': {
        const to = rp(cmd.to);
        const nextIsClose = i + 1 < commands.length && commands[i + 1].kind === 'close';
        // 剔除「回到 move 起点、且下一条即 close」的冗余收尾 line
        if (nextIsClose && moveTo && to[0] === moveTo[0] && to[1] === moveTo[1]) break;
        out.push({ kind: 'line', to });
        break;
      }
      case 'arc': {
        out.push({
          kind: 'arc',
          center: rp(cmd.center),
          radius: round(cmd.radius),
          startAngle: cmd.startAngle,
          endAngle: cmd.endAngle,
          counterClockwise: cmd.counterClockwise,
        });
        break;
      }
      case 'close': {
        out.push({ kind: 'close' });
        break;
      }
    }
  });
  return out;
};

/** contour shape 共用的 path primitive 样式落地 */
export const contourToPathPrimitive = (commands: Array<PathCommand>, style: ResolvedShapeStyle): PathPrim => ({
  type: 'path',
  commands,
  ...pathPrimitiveStyle(style),
});
