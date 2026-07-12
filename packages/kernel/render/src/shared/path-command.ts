/**
 * PathCommand 几何（renderer 无关纯函数）。
 */
import type { ArcPathCommand, EllipseArcPathCommand, PathCommand } from '@retikz/core';

import { alignAngleSweep } from '@retikz/core';

const DEG_TO_RAD = Math.PI / 180;

type ArcCommand = ArcPathCommand | EllipseArcPathCommand;
type Point = [number, number];

const normalizeVector = (x: number, y: number): Point | null => {
  const length = Math.hypot(x, y);
  return length > Number.EPSILON ? [x / length, y / length] : null;
};

const directionBetween = (from: Point, to: Point): Point | null => normalizeVector(to[0] - from[0], to[1] - from[1]);

const rotateVector = (x: number, y: number, rotationDeg: number): Point => {
  const rotation = rotationDeg * DEG_TO_RAD;
  return [x * Math.cos(rotation) - y * Math.sin(rotation), x * Math.sin(rotation) + y * Math.cos(rotation)];
};

/** renderer 统一使用的有向弧扫描区间。 */
export type CommandArcSweep = {
  /** 对齐后的起始角。 */
  start: number;
  /** 沿指定方向对齐后的结束角。 */
  end: number;
  /** 屏幕坐标中的扫描方向：1 为顺时针，-1 为逆时针。 */
  direction: 1 | -1;
};

/** 按 PathCommand 的显式方向或角度顺序解析实际有向 sweep。 */
export const commandArcSweep = (command: ArcCommand): CommandArcSweep => {
  const counterClockwise = command.counterClockwise ?? command.endAngle < command.startAngle;
  const aligned = alignAngleSweep(command.startAngle, command.endAngle, counterClockwise);
  return { ...aligned, direction: counterClockwise ? -1 : 1 };
};

/** 计算旋转椭圆弧在给定参数角上的点。 */
export const ellipseArcPointAt = (command: EllipseArcPathCommand, angleDeg: number): [number, number] => {
  const angle = angleDeg * DEG_TO_RAD;
  const [x, y] = rotateVector(
    command.radiusX * Math.cos(angle),
    command.radiusY * Math.sin(angle),
    command.rotation ?? 0,
  );
  return [command.center[0] + x, command.center[1] + y];
};

/** 计算圆弧或旋转椭圆弧的起点。 */
export const commandArcStart = (command: ArcCommand): [number, number] => {
  if (command.kind === 'ellipseArc') return ellipseArcPointAt(command, command.startAngle);
  const angle = command.startAngle * DEG_TO_RAD;
  return [command.center[0] + Math.cos(angle) * command.radius, command.center[1] + Math.sin(angle) * command.radius];
};

/**
 * 取一个 PathCommand 的末端 endpoint（与 core 同口径）
 * @description move/line/quad/cubic → `to`；arc/ellipseArc → 极坐标末点（绕 center 按 endAngle）；close 无端点 → null。
 *   drawScene 末端箭头定位、animate pathDraw 弧长揭示等共用，避免多处口径漂移。
 */
export const commandEndpoint = (cmd: PathCommand): [number, number] | null => {
  switch (cmd.kind) {
    case 'move':
    case 'line':
    case 'quad':
    case 'cubic':
      return [cmd.to[0], cmd.to[1]];
    case 'arc': {
      const rad = cmd.endAngle * DEG_TO_RAD;
      return [cmd.center[0] + Math.cos(rad) * cmd.radius, cmd.center[1] + Math.sin(rad) * cmd.radius];
    }
    case 'ellipseArc': {
      return ellipseArcPointAt(cmd, cmd.endAngle);
    }
    case 'close':
      return null;
  }
};

const arcTangent = (command: ArcCommand, angleDeg: number): Point | null => {
  const angle = angleDeg * DEG_TO_RAD;
  const sweep = commandArcSweep(command);
  if (sweep.start === sweep.end) return null;
  const { direction } = sweep;
  const radiusX = command.kind === 'arc' ? command.radius : command.radiusX;
  const radiusY = command.kind === 'arc' ? command.radius : command.radiusY;
  const [x, y] = rotateVector(
    -radiusX * Math.sin(angle) * direction,
    radiusY * Math.cos(angle) * direction,
    command.kind === 'ellipseArc' ? (command.rotation ?? 0) : 0,
  );
  return normalizeVector(x, y);
};

/** 计算命令起点处沿绘制方向的单位切线；无可绘制切线时返回 null。 */
export const commandStartTangent = (command: PathCommand, from: Point | null): Point | null => {
  switch (command.kind) {
    case 'move':
    case 'close':
      return null;
    case 'line':
      return from ? directionBetween(from, command.to) : null;
    case 'quad':
      return from ? (directionBetween(from, command.control) ?? directionBetween(from, command.to)) : null;
    case 'cubic':
      return from
        ? (directionBetween(from, command.control1) ??
            directionBetween(from, command.control2) ??
            directionBetween(from, command.to))
        : null;
    case 'arc':
    case 'ellipseArc':
      return arcTangent(command, commandArcSweep(command).start);
  }
};

/** 计算命令终点处沿绘制方向的单位切线；无可绘制切线时返回 null。 */
export const commandEndTangent = (command: PathCommand, from: Point | null): Point | null => {
  switch (command.kind) {
    case 'move':
    case 'close':
      return null;
    case 'line':
      return from ? directionBetween(from, command.to) : null;
    case 'quad':
      return from ? (directionBetween(command.control, command.to) ?? directionBetween(from, command.to)) : null;
    case 'cubic':
      return from
        ? (directionBetween(command.control2, command.to) ??
            directionBetween(command.control1, command.to) ??
            directionBetween(from, command.to))
        : null;
    case 'arc':
    case 'ellipseArc':
      return arcTangent(command, commandArcSweep(command).end);
  }
};

/**
 * 收集一段 path commands 的「控制点」松包围点集（renderer 无关纯函数）
 * @description 曲线取控制点、弧取半径外接角点：move/line → `to`；quad → `control` + `to`；cubic → `control1` +
 *   `control2` + `to`；arc → `center ± radius` 两角点；ellipseArc → `center ± (radiusX, radiusY)` 两角点；close 无点。
 *   控制点凸包必含曲线，故其并集 bbox 是真包围盒的松上界，供 hydration 聚合几何使用；gradient 映射改用
 *   `pathBounds()` 的精确几何口径。
 */
export const pathControlPoints = (commands: ReadonlyArray<PathCommand>): Array<[number, number]> => {
  const points: Array<[number, number]> = [];
  for (const command of commands) {
    switch (command.kind) {
      case 'move':
      case 'line':
        points.push(command.to);
        break;
      case 'quad':
        points.push(command.control, command.to);
        break;
      case 'cubic':
        points.push(command.control1, command.control2, command.to);
        break;
      case 'arc':
        points.push(
          [command.center[0] - command.radius, command.center[1] - command.radius],
          [command.center[0] + command.radius, command.center[1] + command.radius],
        );
        break;
      case 'ellipseArc': {
        const rotation = ((command.rotation ?? 0) * Math.PI) / 180;
        const halfWidth = Math.hypot(command.radiusX * Math.cos(rotation), command.radiusY * Math.sin(rotation));
        const halfHeight = Math.hypot(command.radiusX * Math.sin(rotation), command.radiusY * Math.cos(rotation));
        points.push(
          [command.center[0] - halfWidth, command.center[1] - halfHeight],
          [command.center[0] + halfWidth, command.center[1] + halfHeight],
        );
        break;
      }
      case 'close':
        break;
    }
  }
  return points;
};
