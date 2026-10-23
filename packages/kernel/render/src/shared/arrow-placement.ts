import type { PathCommand } from '@retikz/core';

import { commandArcStart, commandEndpoint, commandEndTangent, commandStartTangent } from './path-command';

type Point = [number, number];

type DrawableCommand = Exclude<PathCommand, { kind: 'move' | 'close' }>;

type DrawableSegment = {
  command: DrawableCommand;
  from: Point;
};

const drawableSegments = (commands: ReadonlyArray<PathCommand>): Array<DrawableSegment> => {
  const segments: Array<DrawableSegment> = [];
  let cursor: Point | null = null;
  let subpathStart: Point | null = null;

  for (const command of commands) {
    if (command.kind === 'move') {
      cursor = [command.to[0], command.to[1]];
      subpathStart = cursor;
      continue;
    }

    if (command.kind === 'close') {
      cursor = subpathStart;
      continue;
    }

    const from = cursor ?? (command.kind === 'arc' || command.kind === 'ellipseArc' ? commandArcStart(command) : null);
    if (from) segments.push({ command, from });
    cursor = commandEndpoint(command);
    if (subpathStart === null && from) subpathStart = from;
  }

  return segments;
};

/**
 * 末端箭头定位：终点 + 入射切线角（指向终点的方向）
 * @description 使用最后一条可绘制命令的几何终点与解析切线；无法判向则角度取 0
 */
export const endArrowPlacement = (commands: ReadonlyArray<PathCommand>): { vertex: Point; angle: number } | null => {
  const segment = drawableSegments(commands).at(-1);
  if (!segment) return null;

  const vertex = commandEndpoint(segment.command);
  if (!vertex) return null;

  const tangent = commandEndTangent(segment.command, segment.from);
  const angle = tangent ? Math.atan2(tangent[1], tangent[0]) : 0;

  return { vertex, angle };
};

/**
 * 起点箭头定位：起点 + 离开切线角的反向（对应 SVG `orient="auto-start-reverse"`）
 * @description 使用第一条可绘制命令的几何起点与解析切线；无法判向则角度取 0
 */
export const startArrowPlacement = (commands: ReadonlyArray<PathCommand>): { vertex: Point; angle: number } | null => {
  const segment = drawableSegments(commands).at(0);
  if (!segment) return null;

  const tangent = commandStartTangent(segment.command, segment.from);
  const angle = tangent ? Math.atan2(tangent[1], tangent[0]) + Math.PI : 0;

  return { vertex: segment.from, angle };
};
