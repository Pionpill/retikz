import type { ArcPathCommand, EllipseArcPathCommand, PathCommand } from '@retikz/core';

import { DEFAULT_EPSILON } from '@retikz/math';

import { commandArcStart, commandArcSweep, commandEndpoint, ellipseArcPointAt } from '../shared';

type ArcCommand = ArcPathCommand | EllipseArcPathCommand;
type Point = [number, number];

/** 默认 round：保留 2 位小数，配 compile/scene/precision 的默认 */
const defaultRound = (n: number) => Math.round(n * 100) / 100;

/**
 * SVG `<path>` A 命令的 large-arc-flag 与 sweep-flag
 * @description largeArc：对齐后的弧跨度 |Δ| > 180° 为 1；sweep：屏幕坐标顺时针为 1、逆时针为 0。
 */
const arcSvgFlags = (
  startAngleDeg: number,
  endAngleDeg: number,
  direction: 1 | -1,
): { largeArc: 0 | 1; sweep: 0 | 1 } => {
  const delta = Math.abs(endAngleDeg - startAngleDeg);
  return {
    largeArc: delta > 180 ? 1 : 0,
    sweep: direction === 1 ? 1 : 0,
  };
};

const arcPointAt = (command: ArcCommand, angleDeg: number): Point => {
  if (command.kind === 'ellipseArc') return ellipseArcPointAt(command, angleDeg);
  const angle = (angleDeg * Math.PI) / 180;
  return [command.center[0] + Math.cos(angle) * command.radius, command.center[1] + Math.sin(angle) * command.radius];
};

/**
 * 把单个 ellipseArc 命令编码为 SVG d 片段（按需拆 360° 退化）
 * @description SVG A 命令在弧跨度 = 360° 时退化为零长（起点==终点 → 不画）；拆成两段半弧绕过。其他跨度直接一段。返回的字符串数组按序拼到 d
 */
const ellipseArcTokens = (command: ArcCommand, round: (n: number) => number): Array<string> => {
  const { start: startAngle, end: endAngle, direction } = commandArcSweep(command);
  const rx = command.kind === 'arc' ? command.radius : command.radiusX;
  const ry = command.kind === 'arc' ? command.radius : command.radiusY;
  const rotation = command.kind === 'arc' ? 0 : (command.rotation ?? 0);
  const span = Math.abs(endAngle - startAngle);
  if (span >= 360 - DEFAULT_EPSILON) {
    // 拆两段半弧避 360° 退化
    const mid = startAngle + (endAngle - startAngle) / 2;
    const midPt = arcPointAt(command, mid);
    const endPt = arcPointAt(command, endAngle);
    const flags1 = arcSvgFlags(startAngle, mid, direction);
    const flags2 = arcSvgFlags(mid, endAngle, direction);
    return [
      `A ${round(rx)} ${round(ry)} ${round(rotation)} ${flags1.largeArc} ${flags1.sweep} ${round(midPt[0])} ${round(midPt[1])}`,
      `A ${round(rx)} ${round(ry)} ${round(rotation)} ${flags2.largeArc} ${flags2.sweep} ${round(endPt[0])} ${round(endPt[1])}`,
    ];
  }
  const endPt = arcPointAt(command, endAngle);
  const flags = arcSvgFlags(startAngle, endAngle, direction);
  return [
    `A ${round(rx)} ${round(ry)} ${round(rotation)} ${flags.largeArc} ${flags.sweep} ${round(endPt[0])} ${round(endPt[1])}`,
  ];
};

const pointsEqual = (a: Point, b: Point): boolean =>
  Math.abs(a[0] - b[0]) <= DEFAULT_EPSILON && Math.abs(a[1] - b[1]) <= DEFAULT_EPSILON;

/**
 * PathCommand[] → SVG `<path>` d 字符串
 * @description core 出结构化命令；本 builder 做 SVG mini-language 翻译。round 缺省按原值（compile 阶段已 round 过坐标，但允许 adapter 二次精度控制）。arc 命令拆 360° 退化为两段半弧；ellipseArc 同理；其他命令一一对应 SVG d 片段
 */
export const buildPathD = (
  commands: ReadonlyArray<PathCommand>,
  round: (n: number) => number = defaultRound,
): string => {
  if (commands.length === 0) return '';
  const tokens: Array<string> = [];
  let cursor: Point | null = null;
  let subpathStart: Point | null = null;
  for (const cmd of commands) {
    switch (cmd.kind) {
      case 'move':
        tokens.push(`M ${round(cmd.to[0])} ${round(cmd.to[1])}`);
        cursor = cmd.to;
        subpathStart = cmd.to;
        break;
      case 'line':
        tokens.push(`L ${round(cmd.to[0])} ${round(cmd.to[1])}`);
        cursor = cmd.to;
        break;
      case 'quad':
        tokens.push(`Q ${round(cmd.control[0])} ${round(cmd.control[1])} ${round(cmd.to[0])} ${round(cmd.to[1])}`);
        cursor = cmd.to;
        break;
      case 'cubic':
        tokens.push(
          `C ${round(cmd.control1[0])} ${round(cmd.control1[1])} ${round(cmd.control2[0])} ${round(cmd.control2[1])} ${round(cmd.to[0])} ${round(cmd.to[1])}`,
        );
        cursor = cmd.to;
        break;
      case 'close':
        tokens.push('Z');
        cursor = subpathStart;
        break;
      case 'arc':
      case 'ellipseArc': {
        const startPt = commandArcStart(cmd);
        if (cursor === null) {
          tokens.push(`M ${round(startPt[0])} ${round(startPt[1])}`);
          subpathStart = startPt;
        } else if (!pointsEqual(cursor, startPt)) {
          tokens.push(`L ${round(startPt[0])} ${round(startPt[1])}`);
        }
        const arcTokens = ellipseArcTokens(cmd, round);
        for (const t of arcTokens) tokens.push(t);
        cursor = commandEndpoint(cmd);
        break;
      }
      default: {
        // exhaustive 防御：新增 kind 必须在此扩展
        const exhaustive: never = cmd;
        throw new Error(`buildPathD: unknown PathCommand kind: ${String((exhaustive as { kind: string }).kind)}`);
      }
    }
  }
  return tokens.join(' ');
};
