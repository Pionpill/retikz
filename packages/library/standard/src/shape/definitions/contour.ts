import type { CoreDependencyProvider, Rect, ScenePrimitive } from '@retikz/core';
import type { Position } from '@retikz/math';

import {
  boundaryFromContour,
  contourCommands,
  contourToPathCommands,
  contourToPathPrimitive,
  defineShape,
  localToWorld,
  pointsConnectionEnvelope,
  vector2,
  verticesToSegments,
} from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { boundsCenter, boundsHalfAxes, boundsOf } from '@retikz/math';
import { z } from 'zod';

import { StandardShapeName } from '../constants';

const ContourShapeParamsSchema = z.strictObject({
  points: z
    .array(z.tuple([z.number(), z.number()]))
    .min(3)
    .describe('At least three two-dimensional vertices forming a closed contour in order.'),
  cornerRadius: NonNegativeNumberSchema.optional().describe(
    'Uniform per-vertex fillet radius in user units; 0 / omitted = sharp corners. Clamped per corner to the largest non-self-intersecting fillet.',
  ),
});

/** Contour 形状的参数 */
export type ContourShapeParams = z.infer<typeof ContourShapeParamsSchema>;

/** 计算点集 AABB 中心 */
const aabbCenterOf = (points: Array<Position>): Position => {
  const bounds = boundsOf(points);
  if (bounds === undefined) throw new Error('contour: points must contain at least one vertex.');
  return boundsCenter(bounds);
};

/** 归一化局部顶点 */
const centeredPoints = (params: ContourShapeParams): Array<Position> => {
  const center = aabbCenterOf(params.points);
  return params.points.map(pointValue => vector2.sub(pointValue, center));
};

/** 将 Contour 转为世界系闭合轮廓 */
const worldVertices = (rect: Rect, params: ContourShapeParams): Array<Position> =>
  centeredPoints(params).map(vertex => localToWorld(rect, vertex));

/** 可选 Contour 形状 Definition */
export const ContourShapeDefinition = defineShape<ContourShapeParams>({
  name: StandardShapeName.Contour,
  paramsSchema: ContourShapeParamsSchema,
  circumscribe: (_halfWidth, _halfHeight, params) => {
    const bounds = boundsOf(params.points);
    if (bounds === undefined) throw new Error('contour: points must contain at least one vertex.');
    return boundsHalfAxes(bounds);
  },
  circumscribeOffset: () => [0, 0],
  boundaryPoint: (rect, toward, params) => {
    const center: Position = [rect.x, rect.y];
    return (
      boundaryFromContour(verticesToSegments(worldVertices(rect, params)), params.cornerRadius, center, toward) ??
      center
    );
  },
  anchor: () => undefined,
  connectionEnvelope: (_rect, kind, params) => pointsConnectionEnvelope(centeredPoints(params), kind),
  *emit(rect, style, round, params): Iterable<ScenePrimitive> {
    const commands = contourToPathCommands(
      contourCommands(verticesToSegments(worldVertices(rect, params)), params.cornerRadius),
      round,
    );
    yield contourToPathPrimitive(commands, style);
  },
  scaleParams: (params, scaleX, scaleY) => ({
    points: params.points.map(([x, y]): Position => [x * scaleX, y * scaleY]),
    ...(params.cornerRadius === undefined ? {} : { cornerRadius: params.cornerRadius * Math.sqrt(scaleX * scaleY) }),
  }),
});

/** Contour 的静态 Core provider */
export const ContourShapeProvider: CoreDependencyProvider = Object.freeze({
  key: { capability: 'shape', name: ContourShapeDefinition.name },
  dependencies: [],
  datasets: {},
  makeDefinition: () => ContourShapeDefinition,
});
