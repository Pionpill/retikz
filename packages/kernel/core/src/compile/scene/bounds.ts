import type { AxisAlignedBounds, BoundsRect } from '@retikz/math';
import { DEG_TO_RAD, boundsOf, boundsToRect, expandBounds, mergeBounds, rectToBounds } from '@retikz/math';

import type {
  GroupPrimitive,
  PathCommand,
  PathPrimitive,
  ScenePrimitive,
  SceneResource,
  Transform,
} from '../../contract';
import { computeSceneTextBounds } from '../../contract';
import type { CanonicalDropShadow, IRPosition } from '../../schemas';
import { applyTransformChain, createCompileInvariantError } from '../shared';
import { buildMarkerGroup } from './marker';
import type { CompileOutput } from './types';

/** canonical visual bounds 对 miter join 使用的保守上限 */
const CANONICAL_STROKE_MITER_LIMIT = 10;

/** 把 bounds 字段中的负零规范化为稳定的正零 */
export const canonicalizeBoundsRect = (bounds: Readonly<BoundsRect>): Readonly<BoundsRect> =>
  Object.freeze({
    x: Object.is(bounds.x, -0) ? 0 : bounds.x,
    y: Object.is(bounds.y, -0) ? 0 : bounds.y,
    width: Object.is(bounds.width, -0) ? 0 : bounds.width,
    height: Object.is(bounds.height, -0) ? 0 : bounds.height,
  });

/** 返回 shadow 影响后的外溢 bbox */
const expandBoundsForShadow = (
  bounds: AxisAlignedBounds,
  shadow: CanonicalDropShadow | undefined,
): AxisAlignedBounds => {
  if (shadow === undefined) return bounds;

  const dx = shadow.offsetX;
  const dy = shadow.offsetY;
  const blur = shadow.blur ?? 0;

  return expandBounds(bounds, {
    left: blur + Math.max(0, -dx),
    right: blur + Math.max(0, dx),
    top: blur + Math.max(0, -dy),
    bottom: blur + Math.max(0, dy),
  });
};

/** 将几何点及其 shadow 外溢范围合并到自动 layout bbox */
export const mergeLayoutBounds = (
  current: AxisAlignedBounds | undefined,
  boundsPoints: ReadonlyArray<IRPosition>,
  canon?: CanonicalDropShadow,
): AxisAlignedBounds | undefined => {
  const bounds = boundsOf(boundsPoints);
  return bounds === undefined ? current : mergeBounds(current, expandBoundsForShadow(bounds, canon));
};

/** 将分配矩形转换为四角贡献点 */
export const allocationPointsOf = (bounds: Readonly<BoundsRect>): Array<IRPosition> => {
  return [
    [bounds.x, bounds.y],
    [bounds.x + bounds.width, bounds.y],
    [bounds.x, bounds.y + bounds.height],
    [bounds.x + bounds.width, bounds.y + bounds.height],
  ];
};

/** 合并两个可选矩形，保留空贡献语义 */
const unionBoundsRects = (left: BoundsRect | undefined, right: BoundsRect | undefined): BoundsRect | undefined => {
  if (left === undefined) return right;
  if (right === undefined) return left;

  const minX = Math.min(left.x, right.x);
  const minY = Math.min(left.y, right.y);
  const maxX = Math.max(left.x + left.width, right.x + right.width);
  const maxY = Math.max(left.y + left.height, right.y + right.height);

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

/** 求矩形交集，无交集时返回 undefined */
const intersectBoundsRects = (left: BoundsRect, right: BoundsRect): BoundsRect | undefined => {
  const x = Math.max(left.x, right.x);
  const y = Math.max(left.y, right.y);
  const maxX = Math.min(left.x + left.width, right.x + right.width);
  const maxY = Math.min(left.y + left.height, right.y + right.height);

  return maxX < x || maxY < y ? undefined : { x, y, width: maxX - x, height: maxY - y };
};

/** 从贡献点计算轴对齐矩形，无点时不贡献边界 */
const calculatePointBounds = (points: ReadonlyArray<IRPosition>): BoundsRect | undefined => {
  const bounds = boundsOf(points);
  return bounds === undefined ? undefined : boundsToRect(bounds);
};

/** 投影矩形四角并重新计算轴对齐边界 */
const projectRect = (rect: BoundsRect, transforms: ReadonlyArray<Transform>): BoundsRect | undefined =>
  calculatePointBounds([
    applyTransformChain([rect.x, rect.y], transforms),
    applyTransformChain([rect.x + rect.width, rect.y], transforms),
    applyTransformChain([rect.x + rect.width, rect.y + rect.height], transforms),
    applyTransformChain([rect.x, rect.y + rect.height], transforms),
  ]);

/** 计算旋转椭圆的轴对齐边界 */
const calculateEllipseBounds = (cx: number, cy: number, rx: number, ry: number, rotationDegrees = 0): BoundsRect => {
  const theta = rotationDegrees * DEG_TO_RAD;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const halfWidth = Math.sqrt((rx * cos) ** 2 + (ry * sin) ** 2);
  const halfHeight = Math.sqrt((rx * sin) ** 2 + (ry * cos) ** 2);

  return {
    x: cx - halfWidth,
    y: cy - halfHeight,
    width: halfWidth * 2,
    height: halfHeight * 2,
  };
};

/** 提取命令的保守边界点，曲线使用控制点包络 */
const calculateCommandBoundsPoints = (command: PathCommand): Array<IRPosition> => {
  switch (command.kind) {
    case 'move':
    case 'line':
      return [command.to];
    case 'quad':
      return [command.control, command.to];
    case 'cubic':
      return [command.control1, command.control2, command.to];
    case 'arc':
      return [
        [command.center[0] - command.radius, command.center[1] - command.radius],
        [command.center[0] + command.radius, command.center[1] + command.radius],
      ];
    case 'ellipseArc': {
      const rect = calculateEllipseBounds(
        command.center[0],
        command.center[1],
        command.radiusX,
        command.radiusY,
        command.rotation,
      );
      return [
        [rect.x, rect.y],
        [rect.x + rect.width, rect.y + rect.height],
      ];
    }
    case 'close':
      return [];
  }
};

/** 合并路径命令的保守边界点 */
const calculatePathBounds = (commands: ReadonlyArray<PathCommand>): BoundsRect | undefined =>
  calculatePointBounds(commands.flatMap(calculateCommandBoundsPoints));

/** 按线宽及 miter 上限扩张几何边界 */
const expandStroke = (rect: BoundsRect, strokeWidth: number | undefined, hasMiterJoin: boolean): BoundsRect => {
  const half = (strokeWidth ?? 1) / 2;
  const amount = hasMiterJoin ? half * CANONICAL_STROKE_MITER_LIMIT : half;

  return {
    x: rect.x - amount,
    y: rect.y - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
};

/** 箭头定位需要的路径端点及切线 */
type EndpointSample = {
  /** 路径端点坐标 */
  point: IRPosition;
  /** 采样处的切线方向 */
  tangent: IRPosition;
};

/** 遍历子路径取得首尾采样点和朝外切线，供箭头边界计算 */
const samplePathEndpoints = (
  commands: ReadonlyArray<PathCommand>,
): {
  start?: EndpointSample;
  end?: EndpointSample;
} => {
  let cursor: IRPosition = [0, 0];
  let subpathStart: IRPosition = cursor;
  let start: EndpointSample | undefined;
  let end: EndpointSample | undefined;

  for (const command of commands) {
    if (command.kind === 'move') {
      cursor = command.to;
      subpathStart = command.to;
      continue;
    }

    let next = cursor;
    let startTangent: IRPosition = [1, 0];
    let endTangent: IRPosition = [1, 0];

    switch (command.kind) {
      case 'line':
        next = command.to;
        startTangent = [next[0] - cursor[0], next[1] - cursor[1]];
        endTangent = startTangent;
        break;
      case 'quad':
        next = command.to;
        startTangent = [command.control[0] - cursor[0], command.control[1] - cursor[1]];
        endTangent = [next[0] - command.control[0], next[1] - command.control[1]];
        break;
      case 'cubic':
        next = command.to;
        startTangent = [command.control1[0] - cursor[0], command.control1[1] - cursor[1]];
        endTangent = [next[0] - command.control2[0], next[1] - command.control2[1]];
        break;
      case 'arc': {
        const startAngle = command.startAngle * DEG_TO_RAD;
        const endAngle = command.endAngle * DEG_TO_RAD;
        const direction = command.counterClockwise === true ? -1 : 1;
        next = [
          command.center[0] + command.radius * Math.cos(endAngle),
          command.center[1] + command.radius * Math.sin(endAngle),
        ];
        startTangent = [-Math.sin(startAngle) * direction, Math.cos(startAngle) * direction];
        endTangent = [-Math.sin(endAngle) * direction, Math.cos(endAngle) * direction];
        break;
      }
      case 'ellipseArc': {
        const theta = (command.rotation ?? 0) * DEG_TO_RAD;

        /** 在椭圆局部角度处采样旋转后的点和切线 */
        const sampleEllipsePoint = (degrees: number): EndpointSample => {
          const angle = degrees * DEG_TO_RAD;
          const x = command.radiusX * Math.cos(angle);
          const y = command.radiusY * Math.sin(angle);
          const tx = -command.radiusX * Math.sin(angle);
          const ty = command.radiusY * Math.cos(angle);

          return {
            point: [
              command.center[0] + x * Math.cos(theta) - y * Math.sin(theta),
              command.center[1] + x * Math.sin(theta) + y * Math.cos(theta),
            ],
            tangent: [tx * Math.cos(theta) - ty * Math.sin(theta), tx * Math.sin(theta) + ty * Math.cos(theta)],
          };
        };

        const first = sampleEllipsePoint(command.startAngle);
        const last = sampleEllipsePoint(command.endAngle);
        const direction = command.counterClockwise === true ? -1 : 1;
        next = last.point;
        startTangent = [first.tangent[0] * direction, first.tangent[1] * direction];
        endTangent = [last.tangent[0] * direction, last.tangent[1] * direction];
        break;
      }
      case 'close':
        next = subpathStart;
        startTangent = [next[0] - cursor[0], next[1] - cursor[1]];
        endTangent = startTangent;
        break;
    }

    start ??= { point: cursor, tangent: [-startTangent[0], -startTangent[1]] };
    end = { point: next, tangent: endTangent };
    cursor = next;
  }

  return { start, end };
};

/** 计算路径首尾箭头的可见边界并合并 */
const calculateMarkerBounds = (
  path: PathPrimitive,
  resources: ReadonlyMap<string, SceneResource>,
): BoundsRect | undefined => {
  const samples = samplePathEndpoints(path.commands);
  const strokeWidth = path.strokeWidth ?? 1;
  const contextStroke = typeof path.stroke === 'string' ? path.stroke : 'currentColor';
  let bounds: BoundsRect | undefined;
  if (path.arrowStart !== undefined && path.arrowStart.opacity !== 0 && samples.start !== undefined) {
    bounds = unionBoundsRects(
      bounds,
      calculatePrimitiveBounds(
        buildMarkerGroup(path.arrowStart, samples.start, {
          strokeWidth,
          round: value => value,
          contextStroke,
        }),
        resources,
      ),
    );
  }

  if (path.arrowEnd !== undefined && path.arrowEnd.opacity !== 0 && samples.end !== undefined) {
    bounds = unionBoundsRects(
      bounds,
      calculatePrimitiveBounds(
        buildMarkerGroup(path.arrowEnd, samples.end, {
          strokeWidth,
          round: value => value,
          contextStroke,
        }),
        resources,
      ),
    );
  }

  return bounds;
};

/** 合并图元填充、描边和阴影对几何边界的贡献 */
const calculateStyledGeometryBounds = (
  primitive: Exclude<ScenePrimitive, GroupPrimitive | { type: 'text' }>,
): BoundsRect | undefined => {
  if (primitive.opacity === 0) return undefined;

  const isFillVisible = primitive.fill !== undefined && primitive.fillOpacity !== 0;
  const isStrokeVisible = primitive.stroke !== undefined && primitive.strokeOpacity !== 0;
  if (!isFillVisible && !isStrokeVisible) return undefined;

  const geometry =
    primitive.type === 'rect'
      ? { x: primitive.x, y: primitive.y, width: primitive.width, height: primitive.height }
      : primitive.type === 'ellipse'
        ? calculateEllipseBounds(primitive.cx, primitive.cy, primitive.rx, primitive.ry, primitive.rotate)
        : calculatePathBounds(primitive.commands);
  if (geometry === undefined) return undefined;

  const painted = isStrokeVisible
    ? expandStroke(
        geometry,
        primitive.strokeWidth,
        primitive.type === 'path' && (primitive.lineJoin ?? 'miter') === 'miter',
      )
    : geometry;

  return primitive.shadow === undefined
    ? painted
    : boundsToRect(expandBoundsForShadow(rectToBounds(painted), primitive.shadow));
};

/** 递归计算图元的可见边界，应用裁剪与组变换 */
const calculatePrimitiveBounds = (
  primitive: ScenePrimitive,
  resources: ReadonlyMap<string, SceneResource>,
): BoundsRect | undefined => {
  if (primitive.type === 'text') {
    if (primitive.opacity === 0) return undefined;

    return computeSceneTextBounds(primitive);
  }

  if (primitive.type === 'group') {
    let bounds = primitive.children.reduce<BoundsRect | undefined>(
      (current, child) => unionBoundsRects(current, calculatePrimitiveBounds(child, resources)),
      undefined,
    );
    if (bounds === undefined) return undefined;
    if (primitive.clipRef !== undefined) {
      const resource = resources.get(primitive.clipRef);
      if (resource === undefined || resource.kind !== 'clip') {
        throw createCompileInvariantError(
          `Cannot resolve clip resource '${primitive.clipRef}' for canonical visual bounds`,
        );
      }

      const clip = calculatePathBounds(resource.path.commands);
      if (clip !== undefined && (clip.width === 0 || clip.height === 0)) return undefined;
      if (clip !== undefined) bounds = intersectBoundsRects(bounds, clip);
      if (bounds === undefined) return undefined;
    }

    return primitive.transforms === undefined || primitive.transforms.length === 0
      ? bounds
      : projectRect(bounds, primitive.transforms);
  }

  if (primitive.type === 'path' && primitive.opacity === 0) return undefined;

  const geometry = calculateStyledGeometryBounds(primitive);

  return primitive.type === 'path' ? unionBoundsRects(geometry, calculateMarkerBounds(primitive, resources)) : geometry;
};

/** 计算最终 Scene 图元树的可见边界；没有可见内容时返回 undefined */
export const calculateBoundsOfPrimitives = (
  primitives: ReadonlyArray<ScenePrimitive>,
  resources: ReadonlyArray<SceneResource>,
): Readonly<BoundsRect> | undefined => {
  /** 当前输出按资源 ID 索引的资源，仅用于本次边界求值 */
  const resourceMap = new Map(resources.map(resource => [resource.id, resource]));
  const bounds = primitives.reduce<BoundsRect | undefined>(
    (current, primitive) => unionBoundsRects(current, calculatePrimitiveBounds(primitive, resourceMap)),
    undefined,
  );
  if (bounds === undefined) return undefined;

  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;
  if (
    ![bounds.x, bounds.y, bounds.width, bounds.height, right, bottom].every(Number.isFinite) ||
    bounds.width < 0 ||
    bounds.height < 0
  ) {
    throw createCompileInvariantError('Canonical visual bounds and their derived edges must remain finite and valid');
  }

  return canonicalizeBoundsRect(bounds);
};

/** 汇总输出的可见布局边界，保留各项阴影扩张语义 */
export const calculateCompileOutputBounds = (contributions: CompileOutput['bounds']): AxisAlignedBounds | undefined => {
  let bounds: AxisAlignedBounds | undefined;
  for (const contribution of contributions) {
    bounds = mergeLayoutBounds(bounds, contribution.boundsPoints, contribution.shadow);
  }
  return bounds;
};
