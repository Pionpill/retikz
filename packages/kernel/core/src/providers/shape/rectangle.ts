import { NonNegativeNumberSchema } from '@retikz/foundation';
import { DEG_TO_RAD, localToWorld, rectOutline, verticesToSegments } from '@retikz/math';
import type { CenteredBox, ContourSegment, Position } from '@retikz/math';
import type { infer as ZodInfer } from 'zod';
import { strictObject } from 'zod';

import type { PathCommand, ScenePrimitive } from '../../contract';
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

/** 把带旋转的矩形轮廓算子转换为结构化 PathCommand */
const computeRectangleOutlinePathCommands = (
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotate?: number;
  },
  cornerRadius?: number,
): Array<PathCommand> => {
  const from: Position = [bounds.x - bounds.width / 2, bounds.y - bounds.height / 2];
  const to: Position = [bounds.x + bounds.width / 2, bounds.y + bounds.height / 2];
  const rotation = (bounds.rotate ?? 0) / DEG_TO_RAD;
  const toWorld = (point: Position): Position => localToWorld(bounds, [point[0] - bounds.x, point[1] - bounds.y]);

  return rectOutline(from, to, cornerRadius).map(operation => {
    if (operation.kind === 'move') return { kind: 'move', to: toWorld(operation.to) };
    if (operation.kind === 'line') return { kind: 'line', to: toWorld(operation.to) };
    if (operation.kind === 'close') return { kind: 'close' };

    return {
      kind: 'ellipseArc',
      center: toWorld(operation.center),
      radiusX: operation.radius,
      radiusY: operation.radius,
      startAngle: operation.startAngle,
      endAngle: operation.endAngle,
      ...(rotation === 0 ? {} : { rotation }),
    };
  });
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
  computeOutline: (bounds, params) => computeRectangleOutlinePathCommands(bounds, params.cornerRadius),
  computeKeyPoints: bounds => {
    const vertices = rectVertices(bounds);
    return [
      { name: 'top-left', position: vertices[0] },
      { name: 'top-right', position: vertices[1] },
      { name: 'bottom-right', position: vertices[2] },
      { name: 'bottom-left', position: vertices[3] },
    ];
  },
  *emit(r, style, round, params): Iterable<ScenePrimitive> {
    const halfW = r.width / 2;
    const halfH = r.height / 2;

    // compile 已把顶层 Node.cornerRadius 合进 params（见 compile/node.ts），故与 boundaryPoint 一致只读 params.cornerRadius
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
