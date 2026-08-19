import type { Rect, ScenePrimitive, ShapeAnchorName } from '@retikz/core';
import type { Position } from '@retikz/math';

import {
  boundaryFromContour,
  CenterAnchor,
  contourCommands,
  contourToPathCommands,
  contourToPathPrimitive,
  isDirectionalAnchor,
  localToWorld,
  pointsConnectionEnvelope,
  rect,
  verticesToSegments,
} from '@retikz/core';

import { RetikzStandardError, RetikzStandardErrorCode } from '../../errors';

/** Shape 外接矩形半轴 */
export type ShapeHalfAxes = { halfWidth: number; halfHeight: number };

/** 根据最终外接半轴生成局部顶点 */
export type PolygonVertices = (halfWidth: number, halfHeight: number) => Array<Position>;

/** 报告无法生成有限 Shape 几何 */
const invalidGeometry = (shape: string, details: Readonly<Record<string, unknown>>): never => {
  throw new RetikzStandardError({
    code: RetikzStandardErrorCode.GeometryInvalid,
    message: `${shape}: derived geometry must be finite.`,
    details: { ...details, shape },
  });
};

/** 校验外接半轴和顶点均为有限值 */
const assertFiniteGeometry = (shape: string, halfAxes: ShapeHalfAxes, vertices: ReadonlyArray<Position>): void => {
  if (
    !Number.isFinite(halfAxes.halfWidth) ||
    !Number.isFinite(halfAxes.halfHeight) ||
    vertices.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))
  ) {
    invalidGeometry(shape, halfAxes);
  }
};

/** 判断圆角轮廓是否完整包含内容矩形四角 */
const containsContentCorners = (
  shape: string,
  innerHalfWidth: number,
  innerHalfHeight: number,
  halfAxes: ShapeHalfAxes,
  cornerRadius: number,
  verticesFor: PolygonVertices,
): boolean => {
  const vertices = verticesFor(halfAxes.halfWidth, halfAxes.halfHeight);
  assertFiniteGeometry(shape, halfAxes, vertices);
  const segments = verticesToSegments(vertices);
  const corners: Array<Position> = [
    [-innerHalfWidth, -innerHalfHeight],
    [innerHalfWidth, -innerHalfHeight],
    [innerHalfWidth, innerHalfHeight],
    [-innerHalfWidth, innerHalfHeight],
  ];
  return corners.every(corner => {
    const requiredDistance = Math.hypot(...corner);
    if (requiredDistance === 0) return true;
    const hit = boundaryFromContour(segments, cornerRadius, [0, 0], corner);
    return hit !== undefined && Math.hypot(...hit) >= requiredDistance - 1e-9;
  });
};

/** 从尖角外接结果扩张到能完整包含内容矩形的最小圆角外接结果 */
export const circumscribeRoundedPolygon = (
  shape: string,
  innerHalfWidth: number,
  innerHalfHeight: number,
  sharpHalfAxes: ShapeHalfAxes,
  cornerRadius: number | undefined,
  verticesFor: PolygonVertices,
): ShapeHalfAxes => {
  const sharpVertices = verticesFor(sharpHalfAxes.halfWidth, sharpHalfAxes.halfHeight);
  assertFiniteGeometry(shape, sharpHalfAxes, sharpVertices);
  if (cornerRadius === undefined || cornerRadius <= 0) return sharpHalfAxes;

  const atScale = (scale: number): ShapeHalfAxes => ({
    halfWidth: sharpHalfAxes.halfWidth * scale,
    halfHeight: sharpHalfAxes.halfHeight * scale,
  });
  if (containsContentCorners(shape, innerHalfWidth, innerHalfHeight, sharpHalfAxes, cornerRadius, verticesFor)) {
    return sharpHalfAxes;
  }

  let lower = 1;
  let upper = 2;
  while (
    Number.isFinite(upper) &&
    !containsContentCorners(shape, innerHalfWidth, innerHalfHeight, atScale(upper), cornerRadius, verticesFor)
  ) {
    lower = upper;
    upper *= 2;
  }
  if (!Number.isFinite(upper)) invalidGeometry(shape, { ...sharpHalfAxes, cornerRadius });

  for (let iteration = 0; iteration < 48; iteration += 1) {
    const middle = (lower + upper) / 2;
    if (containsContentCorners(shape, innerHalfWidth, innerHalfHeight, atScale(middle), cornerRadius, verticesFor)) {
      upper = middle;
    } else {
      lower = middle;
    }
  }
  return atScale(upper);
};

/** 将局部多边形顶点映射到 Shape 世界坐标 */
export const polygonWorldVertices = (bounds: Rect, verticesFor: PolygonVertices): Array<Position> =>
  verticesFor(bounds.width / 2, bounds.height / 2).map(vertex => localToWorld(bounds, vertex));

/** 从最终多边形轮廓解析方向边界点 */
export const polygonBoundaryPoint = (
  bounds: Rect,
  toward: Position,
  cornerRadius: number | undefined,
  verticesFor: PolygonVertices,
): Position => {
  const center: Position = [bounds.x, bounds.y];
  return (
    boundaryFromContour(verticesToSegments(polygonWorldVertices(bounds, verticesFor)), cornerRadius, center, toward) ??
    center
  );
};

/** 解析仅由 Core 提供的标准方向 anchor */
export const polygonAnchor = (bounds: Rect, name: ShapeAnchorName): Position | undefined => {
  if (name === CenterAnchor.Center) return undefined;
  return isDirectionalAnchor(name) ? rect.anchor(bounds, name) : undefined;
};

/** 从最终局部多边形轮廓计算规则连接包络 */
export const polygonConnectionEnvelope = (
  bounds: Rect,
  kind: 'circle' | 'ellipse' | 'rectangle',
  verticesFor: PolygonVertices,
): { halfWidth: number; halfHeight: number } =>
  pointsConnectionEnvelope(verticesFor(bounds.width / 2, bounds.height / 2), kind);

/** 发射与 boundary 共用顶点和圆角语义的多边形路径 */
export const emitPolygon = function* (
  bounds: Rect,
  style: Parameters<typeof contourToPathPrimitive>[1],
  round: (value: number) => number,
  cornerRadius: number | undefined,
  verticesFor: PolygonVertices,
): Iterable<ScenePrimitive> {
  const commands = contourToPathCommands(
    contourCommands(verticesToSegments(polygonWorldVertices(bounds, verticesFor)), cornerRadius),
    round,
  );
  yield contourToPathPrimitive(commands, style);
};
