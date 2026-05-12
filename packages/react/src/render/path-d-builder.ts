import type { PathCommand } from '@retikz/core';

const DEG_TO_RAD = Math.PI / 180;

/** 默认 round：保留 2 位小数，配 compile/precision 的默认 */
const defaultRound = (n: number) => Math.round(n * 100) / 100;

/**
 * SVG `<path>` A 命令的 large-arc-flag 与 sweep-flag
 * @description largeArc：弧跨度 |Δ| > 180° 为 1；sweep：counterClockwise 为 true → 0；否则 endAngle >= startAngle 为 1（角度增加 = SVG 屏幕 CW）。|Δ|=180°/0° 时 largeArc=0
 */
const arcSvgFlags = (
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

/** 椭圆 polar 投影：未旋转椭圆上 angle 处的点（与 polar.ts 同约定，y-down，CW=正） */
const ellipsePointAt = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  angleDeg: number,
): [number, number] => {
  const rad = angleDeg * DEG_TO_RAD;
  return [cx + Math.cos(rad) * rx, cy + Math.sin(rad) * ry];
};

/**
 * 把单个 ellipseArc 命令编码为 SVG d 片段（按需拆 360° 退化）
 * @description SVG A 命令在弧跨度 = 360° 时退化为零长（起点==终点 → 不画）；拆成两段半弧绕过。其他跨度直接一段。返回的字符串数组按序拼到 d
 */
const ellipseArcTokens = (
  center: [number, number],
  rx: number,
  ry: number,
  startAngle: number,
  endAngle: number,
  rotation: number,
  counterClockwise: boolean,
  round: (n: number) => number,
): Array<string> => {
  const span = Math.abs(endAngle - startAngle);
  if (span >= 360 - 1e-9) {
    // 拆两段半弧避 360° 退化
    const mid = startAngle + (endAngle - startAngle) / 2;
    const midPt = ellipsePointAt(center[0], center[1], rx, ry, mid);
    const endPt = ellipsePointAt(center[0], center[1], rx, ry, endAngle);
    const flags1 = arcSvgFlags(startAngle, mid, counterClockwise);
    const flags2 = arcSvgFlags(mid, endAngle, counterClockwise);
    return [
      `A ${round(rx)} ${round(ry)} ${round(rotation)} ${flags1.largeArc} ${flags1.sweep} ${round(midPt[0])} ${round(midPt[1])}`,
      `A ${round(rx)} ${round(ry)} ${round(rotation)} ${flags2.largeArc} ${flags2.sweep} ${round(endPt[0])} ${round(endPt[1])}`,
    ];
  }
  const endPt = ellipsePointAt(center[0], center[1], rx, ry, endAngle);
  const flags = arcSvgFlags(startAngle, endAngle, counterClockwise);
  return [
    `A ${round(rx)} ${round(ry)} ${round(rotation)} ${flags.largeArc} ${flags.sweep} ${round(endPt[0])} ${round(endPt[1])}`,
  ];
};

/**
 * PathCommand[] → SVG `<path>` d 字符串
 * @description core 出结构化命令；本 builder 在 react adapter 内做 SVG mini-language 翻译。round 缺省按原值（compile 阶段已 round 过坐标，但允许 adapter 二次精度控制）。arc 命令拆 360° 退化为两段半弧；ellipseArc 同理；其他命令一一对应 SVG d 片段
 */
export const buildPathD = (
  commands: ReadonlyArray<PathCommand>,
  round: (n: number) => number = defaultRound,
): string => {
  if (commands.length === 0) return '';
  const tokens: Array<string> = [];
  for (const cmd of commands) {
    switch (cmd.kind) {
      case 'move':
        tokens.push(`M ${round(cmd.to[0])} ${round(cmd.to[1])}`);
        break;
      case 'line':
        tokens.push(`L ${round(cmd.to[0])} ${round(cmd.to[1])}`);
        break;
      case 'quad':
        tokens.push(
          `Q ${round(cmd.control[0])} ${round(cmd.control[1])} ${round(cmd.to[0])} ${round(cmd.to[1])}`,
        );
        break;
      case 'cubic':
        tokens.push(
          `C ${round(cmd.control1[0])} ${round(cmd.control1[1])} ${round(cmd.control2[0])} ${round(cmd.control2[1])} ${round(cmd.to[0])} ${round(cmd.to[1])}`,
        );
        break;
      case 'close':
        tokens.push('Z');
        break;
      case 'arc': {
        const startPt = ellipsePointAt(
          cmd.center[0],
          cmd.center[1],
          cmd.radius,
          cmd.radius,
          cmd.startAngle,
        );
        // 第一段如果是 arc，需要先 move 到起点（path 起头单段调用场景）；
        // 否则由上游显式 move 命令保证 cursor 在 startPt——这里仍主动 emit M 让 buildPathD 单独可用
        if (tokens.length === 0) {
          tokens.push(`M ${round(startPt[0])} ${round(startPt[1])}`);
        }
        const arcTokens = ellipseArcTokens(
          cmd.center,
          cmd.radius,
          cmd.radius,
          cmd.startAngle,
          cmd.endAngle,
          0,
          cmd.counterClockwise ?? false,
          round,
        );
        for (const t of arcTokens) tokens.push(t);
        break;
      }
      case 'ellipseArc': {
        const startPt = ellipsePointAt(
          cmd.center[0],
          cmd.center[1],
          cmd.radiusX,
          cmd.radiusY,
          cmd.startAngle,
        );
        if (tokens.length === 0) {
          tokens.push(`M ${round(startPt[0])} ${round(startPt[1])}`);
        }
        const arcTokens = ellipseArcTokens(
          cmd.center,
          cmd.radiusX,
          cmd.radiusY,
          cmd.startAngle,
          cmd.endAngle,
          cmd.rotation ?? 0,
          cmd.counterClockwise ?? false,
          round,
        );
        for (const t of arcTokens) tokens.push(t);
        break;
      }
      default: {
        // exhaustive 防御：新增 kind 必须在此扩展
        const exhaustive: never = cmd;
        throw new Error(
          `buildPathD: unknown PathCommand kind: ${String((exhaustive as { kind: string }).kind)}`,
        );
      }
    }
  }
  return tokens.join(' ');
};
