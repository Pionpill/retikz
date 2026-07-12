import type { ArcPathCommand, EllipseArcPathCommand, PathCommand } from '@retikz/core';

import { commandArcStart, commandArcSweep, commandEndpoint, ellipseArcPointAt } from './path-command';

type Point = [number, number];
type ArcCommand = ArcPathCommand | EllipseArcPathCommand;

const ROOT_EPSILON = 1e-12;

/** PathCommand 绘制几何的轴对齐包围盒。 */
export type PathBounds = {
  /** 左上角 x 坐标。 */
  x: number;
  /** 左上角 y 坐标。 */
  y: number;
  /** 几何宽度。 */
  w: number;
  /** 几何高度。 */
  h: number;
};

const addPoint = (points: Array<Point>, point: Point): void => {
  if (Number.isFinite(point[0]) && Number.isFinite(point[1])) points.push(point);
};

const samePoint = (a: Point, b: Point): boolean =>
  Math.abs(a[0] - b[0]) <= ROOT_EPSILON && Math.abs(a[1] - b[1]) <= ROOT_EPSILON;

const quadraticPoint = (from: Point, control: Point, to: Point, t: number): Point => {
  const remainder = 1 - t;
  return [
    remainder * remainder * from[0] + 2 * remainder * t * control[0] + t * t * to[0],
    remainder * remainder * from[1] + 2 * remainder * t * control[1] + t * t * to[1],
  ];
};

const collectQuadraticBounds = (points: Array<Point>, from: Point, control: Point, to: Point): void => {
  addPoint(points, from);
  addPoint(points, to);
  for (const axis of [0, 1] as const) {
    const denominator = from[axis] - 2 * control[axis] + to[axis];
    if (Math.abs(denominator) <= ROOT_EPSILON) continue;
    const t = (from[axis] - control[axis]) / denominator;
    if (t > 0 && t < 1) addPoint(points, quadraticPoint(from, control, to, t));
  }
};

const cubicPoint = (from: Point, control1: Point, control2: Point, to: Point, t: number): Point => {
  const remainder = 1 - t;
  return [
    remainder ** 3 * from[0] +
      3 * remainder * remainder * t * control1[0] +
      3 * remainder * t * t * control2[0] +
      t ** 3 * to[0],
    remainder ** 3 * from[1] +
      3 * remainder * remainder * t * control1[1] +
      3 * remainder * t * t * control2[1] +
      t ** 3 * to[1],
  ];
};

/** 求落在开区间 (0, 1) 内的二次方程实根。 */
const unitQuadraticRoots = (a: number, b: number, c: number): Array<number> => {
  if (Math.abs(a) <= ROOT_EPSILON) {
    if (Math.abs(b) <= ROOT_EPSILON) return [];
    const root = -c / b;
    return root > 0 && root < 1 ? [root] : [];
  }
  const discriminant = b * b - 4 * a * c;
  if (discriminant < -ROOT_EPSILON) return [];
  if (Math.abs(discriminant) <= ROOT_EPSILON) {
    const root = -b / (2 * a);
    return root > 0 && root < 1 ? [root] : [];
  }
  const squareRoot = Math.sqrt(discriminant);
  const q = -0.5 * (b + (b >= 0 ? squareRoot : -squareRoot));
  const roots = Math.abs(q) <= ROOT_EPSILON ? [-b / (2 * a)] : [q / a, c / q];
  return roots.filter(root => root > 0 && root < 1);
};

const collectCubicBounds = (points: Array<Point>, from: Point, control1: Point, control2: Point, to: Point): void => {
  addPoint(points, from);
  addPoint(points, to);
  const roots = new Set<number>();
  for (const axis of [0, 1] as const) {
    const a = -from[axis] + 3 * control1[axis] - 3 * control2[axis] + to[axis];
    const b = 2 * (from[axis] - 2 * control1[axis] + control2[axis]);
    const c = control1[axis] - from[axis];
    for (const root of unitQuadraticRoots(a, b, c)) roots.add(root);
  }
  for (const root of roots) addPoint(points, cubicPoint(from, control1, control2, to, root));
};

const arcPointAt = (command: ArcCommand, angleDeg: number): Point => {
  if (command.kind === 'ellipseArc') return ellipseArcPointAt(command, angleDeg);
  const angle = (angleDeg * Math.PI) / 180;
  return [command.center[0] + command.radius * Math.cos(angle), command.center[1] + command.radius * Math.sin(angle)];
};

const alignedCandidates = (baseAngle: number, start: number, end: number): Array<number> => {
  const low = Math.min(start, end);
  const high = Math.max(start, end);
  const first = Math.ceil((low - baseAngle) / 360);
  const last = Math.floor((high - baseAngle) / 360);
  const candidates: Array<number> = [];
  for (let turn = first; turn <= last; turn += 1) candidates.push(baseAngle + turn * 360);
  return candidates;
};

const collectArcBounds = (points: Array<Point>, command: ArcCommand): void => {
  const sweep = commandArcSweep(command);
  addPoint(points, arcPointAt(command, sweep.start));
  addPoint(points, arcPointAt(command, sweep.end));

  const radiusX = command.kind === 'arc' ? command.radius : command.radiusX;
  const radiusY = command.kind === 'arc' ? command.radius : command.radiusY;
  const rotation = ((command.kind === 'ellipseArc' ? (command.rotation ?? 0) : 0) * Math.PI) / 180;
  const xExtreme = (Math.atan2(-radiusY * Math.sin(rotation), radiusX * Math.cos(rotation)) * 180) / Math.PI;
  const yExtreme = (Math.atan2(radiusY * Math.cos(rotation), radiusX * Math.sin(rotation)) * 180) / Math.PI;
  for (const base of [xExtreme, xExtreme + 180, yExtreme, yExtreme + 180]) {
    for (const angle of alignedCandidates(base, sweep.start, sweep.end)) addPoint(points, arcPointAt(command, angle));
  }
};

const boundsOf = (points: ReadonlyArray<Point>): PathBounds => {
  if (points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
};

/** 按 renderer 统一的 cursor 与有向 sweep 语义计算 path 真实几何 bbox。 */
export const pathBounds = (commands: ReadonlyArray<PathCommand>): PathBounds => {
  const points: Array<Point> = [];
  let cursor: Point | null = null;
  let subpathStart: Point | null = null;

  for (const command of commands) {
    switch (command.kind) {
      case 'move':
        cursor = command.to;
        subpathStart = command.to;
        break;
      case 'line':
        if (cursor) addPoint(points, cursor);
        addPoint(points, command.to);
        cursor = command.to;
        break;
      case 'quad':
        collectQuadraticBounds(points, cursor ?? command.to, command.control, command.to);
        cursor = command.to;
        break;
      case 'cubic':
        collectCubicBounds(points, cursor ?? command.to, command.control1, command.control2, command.to);
        cursor = command.to;
        break;
      case 'arc':
      case 'ellipseArc': {
        const arcStart = commandArcStart(command);
        if (cursor === null) subpathStart = arcStart;
        else if (!samePoint(cursor, arcStart)) {
          addPoint(points, cursor);
          addPoint(points, arcStart);
        }
        collectArcBounds(points, command);
        cursor = commandEndpoint(command);
        break;
      }
      case 'close':
        if (cursor && subpathStart) {
          addPoint(points, cursor);
          addPoint(points, subpathStart);
        }
        cursor = subpathStart;
        break;
    }
  }

  return boundsOf(points);
};
