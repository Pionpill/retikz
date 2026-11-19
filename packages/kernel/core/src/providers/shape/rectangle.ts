import { NonNegativeNumberSchema } from '@retikz/foundation';
import type { CenteredBox, ContourSegment, Position } from '@retikz/math';
import { DEFAULT_EPSILON, localToWorld, verticesToSegments, worldToLocal } from '@retikz/math';
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
    if (halfWidth > DEFAULT_EPSILON && halfHeight > DEFAULT_EPSILON) {
      const localToward = worldToLocal(bounds, toward);
      // 只有两个分量都足够小时才需要精算到中心的距离
      if (Math.abs(localToward[0]) < 1e-12 && Math.abs(localToward[1]) < 1e-12 && Math.hypot(...localToward) < 1e-12)
        return [bounds.x, bounds.y];
      const directionX = localToward[0] / halfWidth;
      const directionY = localToward[1] / halfHeight;
      const absoluteX = Math.abs(directionX);
      const absoluteY = Math.abs(directionY);
      // ⚡单位矩形中最大绝对分量为 1 的方向已在边界上，不再与命中边重复求交
      const verticalEdge = absoluteX > absoluteY;
      const scale = verticalEdge ? absoluteX : absoluteY;
      const unitX = directionX / scale;
      const unitY = directionY / scale;
      const localHit: Position =
        Number.isFinite(unitX) && Number.isFinite(unitY) ? [unitX * halfWidth, unitY * halfHeight] : [NaN, NaN];
      const radius = params.cornerRadius ?? 0;
      if (radius === 0) return localToWorld(bounds, localHit);
      const cornerDistance = verticalEdge ? halfHeight - Math.abs(localHit[1]) : halfWidth - Math.abs(localHit[0]);
      if (cornerDistance > radius) return localToWorld(bounds, localHit);
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
