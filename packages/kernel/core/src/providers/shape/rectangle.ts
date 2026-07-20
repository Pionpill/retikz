import type { Position } from '@retikz/math';

import { z } from 'zod';

import type { ScenePrimitive } from '../../contract';
import type { ContourSegment, Rect } from '../../shared';

import { defineShape } from '../../contract';
import { BuiltinShape } from '../../schemas';
import {
  boundaryFromContour,
  boundsConnectionEnvelope,
  CenterAnchor,
  isDirectionalAnchor,
  localToWorld,
  rect,
} from '../../shared';
import { verticesToSegments } from './outline';
import { rectPrimitiveStyle } from './style';

const rectangleParamsSchema = z.strictObject({
  cornerRadius: z
    .number()
    .nonnegative()
    .optional()
    .describe(
      'Corner radius in user units; 0 / omitted = sharp corners. Clamped per corner to the largest non-self-intersecting fillet.',
    ),
});

type RectangleParams = z.infer<typeof rectangleParamsSchema>;

/** 轴对齐 / 旋转矩形的 4 个角（CW 绕向：左上 → 右上 → 右下 → 左下），局部系经 localToWorld 投世界 */
const rectVertices = (bounds: Rect): Array<Position> => {
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
  circumscribe: (hw, hh) => ({ halfWidth: hw, halfHeight: hh }),
  boundaryPoint: (bounds: Rect, toward: Position, params): Position => {
    const verts = rectVertices(bounds);
    const segments: Array<ContourSegment> = verticesToSegments(verts);
    const center: Position = [bounds.x, bounds.y];
    const hit = boundaryFromContour(segments, params.cornerRadius, center, toward);
    return hit ?? center;
  },
  anchor: (r, name) => {
    if (name === CenterAnchor.Center) return undefined;
    return isDirectionalAnchor(name) ? rect.anchor(r, name) : undefined;
  },
  edgePoint: (r, side, t) => rect.edgePoint(r, side, t),
  connectionEnvelope: boundsConnectionEnvelope,
  *emit(r, style, round, params): Iterable<ScenePrimitive> {
    const halfW = r.width / 2;
    const halfH = r.height / 2;
    // compile 已把顶层 Node.cornerRadius 合进 params（见 compile/node.ts），故与 boundaryPoint 一致只读 params.cornerRadius
    const cornerRadius = params.cornerRadius;
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
