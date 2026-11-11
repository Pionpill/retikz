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

/** 单次遍历汇总命令的保守边界，曲线仍使用控制点包络，不物化中间点集 */
const calculatePathBounds = (commands: ReadonlyArray<PathCommand>): BoundsRect | undefined => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let pointCount = 0;

  /** 保持boundsOf的比较顺序、负零与非有限数语义，仅将点提取和扫描融合 */
  const includePoint = (x: number, y: number): void => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    pointCount++;
  };

  for (const command of commands) {
    switch (command.kind) {
      case 'move':
      case 'line':
        includePoint(command.to[0], command.to[1]);
        break;
      case 'quad':
        includePoint(command.control[0], command.control[1]);
        includePoint(command.to[0], command.to[1]);
        break;
      case 'cubic':
        includePoint(command.control1[0], command.control1[1]);
        includePoint(command.control2[0], command.control2[1]);
        includePoint(command.to[0], command.to[1]);
        break;
      case 'arc':
        includePoint(command.center[0] - command.radius, command.center[1] - command.radius);
        includePoint(command.center[0] + command.radius, command.center[1] + command.radius);
        break;
      case 'ellipseArc': {
        const rect = calculateEllipseBounds(
          command.center[0],
          command.center[1],
          command.radiusX,
          command.radiusY,
          command.rotation,
        );
        includePoint(rect.x, rect.y);
        includePoint(rect.x + rect.width, rect.y + rect.height);
        break;
      }
      case 'close':
        break;
    }
  }

  return pointCount === 0 ? undefined : boundsToRect({ minX, minY, maxX, maxY });
};

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
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);

        /** 在椭圆局部角度处采样旋转后的点和切线 */
        const sampleEllipsePoint = (degrees: number): EndpointSample => {
          const angle = degrees * DEG_TO_RAD;
          const x = command.radiusX * Math.cos(angle);
          const y = command.radiusY * Math.sin(angle);
          const tx = -command.radiusX * Math.sin(angle);
          const ty = command.radiusY * Math.cos(angle);

          return {
            point: [command.center[0] + x * cos - y * sin, command.center[1] + x * sin + y * cos],
            tangent: [tx * cos - ty * sin, tx * sin + ty * cos],
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
  // 没有可见箭头时无需遍历路径计算端点与切线
  if (
    (path.arrowStart === undefined || path.arrowStart.opacity === 0) &&
    (path.arrowEnd === undefined || path.arrowEnd.opacity === 0)
  )
    return undefined;

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
      const clip = resolveGroupClipBounds(primitive.clipRef, resources);
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

  return finalizeVisualBounds(bounds);
};

/** 查询分组裁剪资源并保持路径的保守包络语义 */
const resolveGroupClipBounds = (
  clipRef: string,
  resources: ReadonlyMap<string, SceneResource>,
): BoundsRect | undefined => {
  const resource = resources.get(clipRef);
  if (resource === undefined || resource.kind !== 'clip') {
    throw createCompileInvariantError(`Cannot resolve clip resource '${clipRef}' for canonical visual bounds`);
  }
  return calculatePathBounds(resource.path.commands);
};

/** 验证可见边界及派生边沿，统一冻结与负零规范化 */
const finalizeVisualBounds = (bounds: BoundsRect): Readonly<BoundsRect> => {
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

/** 包内分组矩形投影器；一次消费共享裁剪准备，不持有跨次缓存 */
export const createGroupBoundsProjector = (
  group: Omit<GroupPrimitive, 'children'>,
  resources: ReadonlyArray<SceneResource>,
): ((bounds: BoundsRect) => Readonly<BoundsRect> | undefined) => {
  let prepared = false;
  let clip: BoundsRect | undefined;
  return bounds => {
    // ⚡整组贡献只索引资源并扫描裁剪一次；延迟到首个非空装饰以保留报错时点
    if (!prepared) {
      if (group.clipRef !== undefined) {
        clip = resolveGroupClipBounds(group.clipRef, new Map(resources.map(resource => [resource.id, resource])));
      }
      prepared = true;
    }
    if (clip !== undefined && (clip.width === 0 || clip.height === 0)) return undefined;
    const visible = clip === undefined ? bounds : intersectBoundsRects(bounds, clip);
    if (visible === undefined) return undefined;
    const projected =
      group.transforms === undefined || group.transforms.length === 0
        ? visible
        : projectRect(visible, group.transforms);
    return projected === undefined ? undefined : finalizeVisualBounds(projected);
  };
};

/** 汇总输出的可见布局边界，保留各项阴影扩张语义 */
export const calculateCompileOutputBounds = (contributions: CompileOutput['bounds']): AxisAlignedBounds | undefined => {
  let bounds: AxisAlignedBounds | undefined;
  for (const contribution of contributions) {
    bounds = mergeLayoutBounds(bounds, contribution.boundsPoints, contribution.shadow);
  }
  return bounds;
};
