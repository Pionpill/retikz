import type { BoundsRect } from '@retikz/math';
import { boundsToRect, rectToBounds } from '@retikz/math';

import type { ClipResource, GroupPrimitive, PathPrimitive, ScenePrimitive, SceneResources } from '../../contract';
import { computeSceneTextBounds } from '../../contract';
import { createCompileInvariantError } from '../shared';
import {
  canonicalizeBoundsRect,
  expandBoundsForShadow,
  intersectBoundsRects,
  projectBoundsRect,
  unionBoundsRects,
} from './bounds';
import { calculateEllipseBounds, calculatePathBounds, samplePathEndpoints } from './bounds-path';
import { buildMarkerGroup } from './marker';

/** canonical visual bounds 对 miter join 使用的保守上限 */
const CANONICAL_STROKE_MITER_LIMIT = 10;

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

/** 计算路径首尾箭头的可见边界并合并 */
const calculateMarkerBounds = (
  path: PathPrimitive,
  resolveClipBounds: (clipRef: string) => BoundsRect | undefined,
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
        resolveClipBounds,
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
        resolveClipBounds,
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
  resolveClipBounds: (clipRef: string) => BoundsRect | undefined,
): BoundsRect | undefined => {
  if (primitive.type === 'text') {
    if (primitive.opacity === 0) return undefined;

    return computeSceneTextBounds(primitive);
  }

  if (primitive.type === 'group') {
    let bounds = calculatePrimitiveListBounds(primitive.children, resolveClipBounds);
    if (bounds === undefined) return undefined;
    if (primitive.clipRef !== undefined) {
      const clip = resolveClipBounds(primitive.clipRef);
      if (clip !== undefined && (clip.width === 0 || clip.height === 0)) return undefined;
      if (clip !== undefined) bounds = intersectBoundsRects(bounds, clip);
      if (bounds === undefined) return undefined;
    }

    return primitive.transforms === undefined || primitive.transforms.length === 0
      ? bounds
      : projectBoundsRect(bounds, primitive.transforms);
  }

  if (primitive.type === 'path' && primitive.opacity === 0) return undefined;

  const geometry = calculateStyledGeometryBounds(primitive);

  return primitive.type === 'path'
    ? unionBoundsRects(geometry, calculateMarkerBounds(primitive, resolveClipBounds))
    : geometry;
};

/** 汇总本次递归新建的矩形，不修改输入图元或裁剪缓存 */
const calculatePrimitiveListBounds = (
  primitives: ReadonlyArray<ScenePrimitive>,
  resolveClipBounds: (clipRef: string) => BoundsRect | undefined,
): BoundsRect | undefined => {
  let bounds: BoundsRect | undefined;
  for (const primitive of primitives) {
    const current = calculatePrimitiveBounds(primitive, resolveClipBounds);
    if (current === undefined) continue;
    if (bounds === undefined) {
      bounds = current;
      continue;
    }
    // ⚡累计矩形由当前求值独占，保留每次 x+width 的算术顺序而不再创建并集对象
    const minX = Math.min(bounds.x, current.x);
    const minY = Math.min(bounds.y, current.y);
    const maxX = Math.max(bounds.x + bounds.width, current.x + current.width);
    const maxY = Math.max(bounds.y + bounds.height, current.y + current.height);
    bounds.x = minX;
    bounds.y = minY;
    bounds.width = maxX - minX;
    bounds.height = maxY - minY;
  }
  return bounds;
};

/** 只索引实际被边界计算消费的裁剪资源 */
const indexClipResources = (resources: SceneResources): ReadonlyMap<string, ClipResource> => {
  const resourceMap = new Map<string, ClipResource>();
  for (const resource of resources.clips) resourceMap.set(resource.id, resource);
  return resourceMap;
};

/** 单次边界求值按需查询并复用裁剪包络 */
const createClipBoundsResolver = (resources: SceneResources): ((clipRef: string) => BoundsRect | undefined) => {
  let clipResources: ReadonlyMap<string, ClipResource> | undefined;
  let clipBounds: Map<string, BoundsRect | undefined> | undefined;
  return clipRef => {
    if (clipBounds?.has(clipRef)) return clipBounds.get(clipRef);
    // ⚡没有可见裁剪时不创建索引；共享裁剪路径只在本次求值中扫描一次
    clipResources ??= indexClipResources(resources);
    const bounds = resolveGroupClipBounds(clipRef, clipResources);
    (clipBounds ??= new Map()).set(clipRef, bounds);
    return bounds;
  };
};

/** 计算最终 Scene 图元树的可见边界；没有可见内容时返回 undefined */
export const calculateBoundsOfPrimitives = (
  primitives: ReadonlyArray<ScenePrimitive>,
  resources: SceneResources,
): Readonly<BoundsRect> | undefined => {
  const bounds = calculatePrimitiveListBounds(primitives, createClipBoundsResolver(resources));
  if (bounds === undefined) return undefined;

  return finalizeVisualBounds(bounds);
};

/** 查询分组裁剪资源并保持路径的保守包络语义 */
const resolveGroupClipBounds = (
  clipRef: string,
  resources: ReadonlyMap<string, ClipResource>,
): BoundsRect | undefined => {
  const resource = resources.get(clipRef);
  if (resource === undefined) {
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
  resources: SceneResources,
): ((bounds: BoundsRect) => Readonly<BoundsRect> | undefined) => {
  let prepared = false;
  let clip: BoundsRect | undefined;
  return bounds => {
    // ⚡整组贡献只索引资源并扫描裁剪一次；延迟到首个非空装饰以保留报错时点
    if (!prepared) {
      if (group.clipRef !== undefined) {
        clip = resolveGroupClipBounds(group.clipRef, indexClipResources(resources));
      }
      prepared = true;
    }
    if (clip !== undefined && (clip.width === 0 || clip.height === 0)) return undefined;
    const visible = clip === undefined ? bounds : intersectBoundsRects(bounds, clip);
    if (visible === undefined) return undefined;
    const projected =
      group.transforms === undefined || group.transforms.length === 0
        ? visible
        : projectBoundsRect(visible, group.transforms);
    return projected === undefined ? undefined : finalizeVisualBounds(projected);
  };
};
