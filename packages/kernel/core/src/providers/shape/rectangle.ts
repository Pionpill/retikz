import { NonNegativeNumberSchema } from '@retikz/foundation';
import type { CenteredBox, ContourSegment, Position } from '@retikz/math';
import { DEFAULT_EPSILON, intersect, localToWorld, verticesToSegments, worldToLocal } from '@retikz/math';
import type { infer as ZodInfer } from 'zod';
import { strictObject } from 'zod';

import type { ScenePrimitive } from '../../contract';
import { defineShape } from '../../contract';
import { BuiltinShape } from '../../schemas';
import { CenterAnchor, boundaryFromContour, boundsConnectionEnvelope, isDirectionalAnchor, rect } from '../../shared';
import { rectPrimitiveStyle } from './style';

const rectangleParamsSchema = strictObject({
  cornerRadius: NonNegativeNumberSchema.optional().describe(
    'Corner radius in user units; 0 / omitted = sharp corners. Clamped per corner to the largest non-self-intersecting fillet.',
  ),
});

type RectangleParams = ZodInfer<typeof rectangleParamsSchema>;

/** ⚡直角矩形复用固定的单位轮廓，避免每次求交重建四顶点与四线段 */
const sharpRectangleContour = verticesToSegments([
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
]);

/** 单位轮廓的射线原点，不随几何查询变化 */
const rectangleOrigin: Position = [0, 0];

/** 轴对齐 / 旋转矩形的 4 个角（CW 绕向：左上 → 右上 → 右下 → 左下），局部系经 localToWorld 投世界 */
const rectVertices = (bounds: CenteredBox): Array<Position> => {
  const halfW = bounds.width / 2;
  const halfH = bounds.height / 2;

  return [
    localToWorld(bounds, [-halfW, -halfH]),
    localToWorld(bounds, [halfW, -halfH]),
    localToWorld(bounds, [halfW, halfH]),
    localToWorld(bounds, [-halfW, halfH]),
  ];
};

/**
 * rectangle 注册项：文本容器矩形
 * @description anchor / edgePoint 走 rect 几何；cornerRadius 影响 boundaryPoint 和 emit。
 *   scaleParams 只缩 cornerRadius
 */
export const rectangle = defineShape<RectangleParams>({
  name: BuiltinShape.Rectangle,
  paramsSchema: rectangleParamsSchema,
  computeCircumscribedGeometry: (hw, hh) => ({ halfWidth: hw, halfHeight: hh }),
  computeBoundaryPoint: (bounds: CenteredBox, toward: Position, params): Position => {
    const halfWidth = bounds.width / 2;
    const halfHeight = bounds.height / 2;
    if (
      (params.cornerRadius === undefined || params.cornerRadius === 0) &&
      halfWidth > DEFAULT_EPSILON &&
      halfHeight > DEFAULT_EPSILON
    ) {
      const localToward = worldToLocal(bounds, toward);
      if (Math.hypot(localToward[0], localToward[1]) < 1e-12) return [bounds.x, bounds.y];
      const directionX = localToward[0] / halfWidth;
      const directionY = localToward[1] / halfHeight;
      const absoluteX = Math.abs(directionX);
      const absoluteY = Math.abs(directionY);
      const directionScale = Math.max(absoluteX, absoluteY);
      const edgeIndex = absoluteX > absoluteY ? (directionX > 0 ? 1 : 3) : directionY > 0 ? 2 : 0;
      // ⚡射线命中边已由单位方向确定，复用直线求交，省去通用轮廓遍历与方向单位化
      const edge = sharpRectangleContour[edgeIndex];
      const hit = intersect.lineLine({
        a1: rectangleOrigin,
        a2: [directionX / directionScale, directionY / directionScale],
        b1: edge.from,
        b2: edge.to,
      });
      return hit === null ? [bounds.x, bounds.y] : localToWorld(bounds, [hit[0] * halfWidth, hit[1] * halfHeight]);
    }

    const verts = rectVertices(bounds);
    const segments: Array<ContourSegment> = verticesToSegments(verts);
    const center: Position = [bounds.x, bounds.y];
    const hit = boundaryFromContour(segments, params.cornerRadius, center, toward);

    return hit ?? center;
  },
  resolveAnchor: (r, name) => {
    if (name === CenterAnchor.Center) return undefined;
    return isDirectionalAnchor(name) ? rect.anchor(r, name) : undefined;
  },
  computeEdgePoint: (r, side, t) => rect.edgePoint(r, side, t),
  computeConnectionEnvelope: boundsConnectionEnvelope,
  *emit(r, style, round, params): Iterable<ScenePrimitive> {
    const halfW = r.width / 2;
    const halfH = r.height / 2;

    // resolve/node/shape.ts 已把顶层 Node.cornerRadius 合进 params，故与 boundaryPoint 一致只读 params.cornerRadius
    const cornerRadius = params.cornerRadius === undefined ? undefined : Math.min(params.cornerRadius, halfW, halfH);
    yield {
      type: 'rect',
      x: round(r.x - halfW),
      y: round(r.y - halfH),
      width: round(r.width),
      height: round(r.height),
      ...rectPrimitiveStyle(style, cornerRadius !== undefined ? round(cornerRadius) : undefined),
    };
  },
  scaleParams: (params, sx: number, sy: number) =>
    params.cornerRadius === undefined ? params : { ...params, cornerRadius: params.cornerRadius * Math.sqrt(sx * sy) },
});
