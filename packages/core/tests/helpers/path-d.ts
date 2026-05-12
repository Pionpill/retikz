import type { PathCommand } from '../../src/primitive';

const DEG_TO_RAD = Math.PI / 180;

/** 与生产 compile 的默认 round（精度 2 位）对齐，避免 cos(90)=6.12e-17 这类浮点噪声泄漏到字符串 */
const round = (n: number) => Math.round(n * 100) / 100;

const ellipsePoint = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  angleDeg: number,
): [number, number] => {
  const rad = angleDeg * DEG_TO_RAD;
  return [round(cx + Math.cos(rad) * rx), round(cy + Math.sin(rad) * ry)];
};

const arcFlags = (
  startAngleDeg: number,
  endAngleDeg: number,
  counterClockwise: boolean,
): { largeArc: 0 | 1; sweep: 0 | 1 } => {
  const delta = Math.abs(endAngleDeg - startAngleDeg);
  return {
    largeArc: delta > 180 ? 1 : 0,
    sweep: counterClockwise ? 0 : endAngleDeg >= startAngleDeg ? 1 : 0,
  };
};

const ellipseArcTokens = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  startAngle: number,
  endAngle: number,
  rotation: number,
  counterClockwise: boolean,
): Array<string> => {
  const span = Math.abs(endAngle - startAngle);
  if (span >= 360 - 1e-9) {
    const mid = startAngle + (endAngle - startAngle) / 2;
    const midPt = ellipsePoint(cx, cy, rx, ry, mid);
    const endPt = ellipsePoint(cx, cy, rx, ry, endAngle);
    const f1 = arcFlags(startAngle, mid, counterClockwise);
    const f2 = arcFlags(mid, endAngle, counterClockwise);
    return [
      `A ${rx} ${ry} ${rotation} ${f1.largeArc} ${f1.sweep} ${midPt[0]} ${midPt[1]}`,
      `A ${rx} ${ry} ${rotation} ${f2.largeArc} ${f2.sweep} ${endPt[0]} ${endPt[1]}`,
    ];
  }
  const endPt = ellipsePoint(cx, cy, rx, ry, endAngle);
  const f = arcFlags(startAngle, endAngle, counterClockwise);
  return [`A ${rx} ${ry} ${rotation} ${f.largeArc} ${f.sweep} ${endPt[0]} ${endPt[1]}`];
};

/**
 * 测试 helper：PathCommand[] → SVG d 字符串
 * @description 镜像 react adapter 的 buildPathD，仅在测试断言里复用旧式 d 字符串契约。生产代码不要 import 本 helper
 */
export const pathCommandsToD = (commands: ReadonlyArray<PathCommand>): string => {
  if (commands.length === 0) return '';
  const tokens: Array<string> = [];
  for (const cmd of commands) {
    switch (cmd.kind) {
      case 'move':
        tokens.push(`M ${cmd.to[0]} ${cmd.to[1]}`);
        break;
      case 'line':
        tokens.push(`L ${cmd.to[0]} ${cmd.to[1]}`);
        break;
      case 'quad':
        tokens.push(
          `Q ${cmd.control[0]} ${cmd.control[1]} ${cmd.to[0]} ${cmd.to[1]}`,
        );
        break;
      case 'cubic':
        tokens.push(
          `C ${cmd.control1[0]} ${cmd.control1[1]} ${cmd.control2[0]} ${cmd.control2[1]} ${cmd.to[0]} ${cmd.to[1]}`,
        );
        break;
      case 'close':
        tokens.push('Z');
        break;
      case 'arc': {
        const startPt = ellipsePoint(
          cmd.center[0],
          cmd.center[1],
          cmd.radius,
          cmd.radius,
          cmd.startAngle,
        );
        if (tokens.length === 0) {
          tokens.push(`M ${startPt[0]} ${startPt[1]}`);
        }
        const arcs = ellipseArcTokens(
          cmd.center[0],
          cmd.center[1],
          cmd.radius,
          cmd.radius,
          cmd.startAngle,
          cmd.endAngle,
          0,
          cmd.counterClockwise ?? false,
        );
        for (const t of arcs) tokens.push(t);
        break;
      }
      case 'ellipseArc': {
        const startPt = ellipsePoint(
          cmd.center[0],
          cmd.center[1],
          cmd.radiusX,
          cmd.radiusY,
          cmd.startAngle,
        );
        if (tokens.length === 0) {
          tokens.push(`M ${startPt[0]} ${startPt[1]}`);
        }
        const arcs = ellipseArcTokens(
          cmd.center[0],
          cmd.center[1],
          cmd.radiusX,
          cmd.radiusY,
          cmd.startAngle,
          cmd.endAngle,
          cmd.rotation ?? 0,
          cmd.counterClockwise ?? false,
        );
        for (const t of arcs) tokens.push(t);
        break;
      }
    }
  }
  return tokens.join(' ');
};
