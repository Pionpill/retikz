import type { Position } from '../geometry/point';
import type { ContourCommand, LineSegment } from '../geometry/contour';
import type { PathCommand } from '../primitive';

/**
 * 由顶点环构造闭合折线段序列（接缝顺序同顶点顺序）
 * @description 第 i 段 from = 顶点 i、to = 顶点 (i+1)%n；供 polygon / star 的 emit / boundaryPoint
 *   委托 rounded-contour 模块。绕向与各形状现状 emit 顶点顺序一致（rounded-contour 据接缝转向叉积判内外侧、
 *   凸 / 凹角统一处理），polygon 全凸、star 凸尖 / 凹角交替都用这同一条构造。
 */
export const verticesToSegments = (verts: Array<Position>): Array<LineSegment> =>
  verts.map((from, i) => ({ kind: 'line', from, to: verts[(i + 1) % verts.length] }));

/**
 * contour 命令 → path PathCommand（每点过 round）
 * @description passthrough（r 省略 / 0）时每段都 emit 一条回到起点的 line、末尾接 close；而顶点形状现状 emit
 *   是 `move + (n−1) line + close`（无回起点的冗余 line）——故此处剔除「紧贴 close 前、落点 == 初始 move 落点」
 *   的那条 line，保证 r=0 与现状逐字等价。fillet（r>0）时末尾 fillet 弧已自然收尾，无该冗余。
 *   polygon / star 共用此映射器（单一实现）。
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
