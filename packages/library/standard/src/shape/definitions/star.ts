import type { CoreDependencyProvider, Rect, ScenePrimitive, ShapeAnchorName } from '@retikz/core';
import type { Position } from '@retikz/math';

import {
  boundaryFromContour,
  contourCommands,
  contourToPathCommands,
  contourToPathPrimitive,
  defineShape,
  DEG_TO_RAD,
  localToWorld,
  pointsConnectionEnvelope,
  verticesToSegments,
} from '@retikz/core';
import { NonNegativeNumberSchema, PositiveNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

import { StandardShapeName } from '../constants';

const MaxStarPoints = 1024;

const StarShapeParamsSchema = z
  .strictObject({
    points: z
      .number()
      .int()
      .min(3)
      .max(MaxStarPoints)
      .describe(`Number of star points (3..${MaxStarPoints}); capped to bound vertex count (mirrors polygon sides).`),
    innerRadius: PositiveNumberSchema.describe('Inner (notch) radius in user units.'),
    outerRadius: PositiveNumberSchema.describe('Outer (tip) radius in user units; must be > innerRadius.'),
    rotate: z
      .number()
      .optional()
      .describe(
        'Shape self-rotation in degrees; default 0 = first tip points up (screen -y / top); positive rotates clockwise (screen). Composes with Node.rotate.',
      ),
    cornerRadius: NonNegativeNumberSchema.optional().describe(
      'Corner radius in user units; 0 / omitted = sharp corners. Clamped per corner to the largest non-self-intersecting fillet.',
    ),
  })
  .refine(params => params.outerRadius > params.innerRadius, {
    message: 'outerRadius must be greater than innerRadius',
  });

/** Star 形状的参数 */
export type StarShapeParams = z.infer<typeof StarShapeParamsSchema>;

/** Star 的派生几何 */
type StarGeometry = {
  vertices: Array<Position>;
  aabbHalfAxes: { halfWidth: number; halfHeight: number };
};

/** 计算 Star 顶点与 AABB */
const starGeometry = (params: StarShapeParams): StarGeometry => {
  const { points, innerRadius, outerRadius } = params;
  const rotate = params.rotate ?? 0;
  const step = 180 / points;
  const vertices: Array<Position> = [];
  let maxAbsX = 0;
  let maxAbsY = 0;
  for (let index = 0; index < 2 * points; index += 1) {
    const angle = (rotate + index * step - 90) * DEG_TO_RAD;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    vertices.push([x, y]);
    maxAbsX = Math.max(maxAbsX, Math.abs(x));
    maxAbsY = Math.max(maxAbsY, Math.abs(y));
  }
  return { vertices, aabbHalfAxes: { halfWidth: maxAbsX, halfHeight: maxAbsY } };
};

/** 星形局部顶点转换为世界坐标 */
const worldVertices = (rect: Rect, geometry: StarGeometry): Array<Position> =>
  geometry.vertices.map(vertex => localToWorld(rect, vertex));

/** 可选 Star 形状 Definition */
export const StarShapeDefinition = defineShape<StarShapeParams>({
  name: StandardShapeName.Star,
  paramsSchema: StarShapeParamsSchema,
  circumscribe: (_halfWidth, _halfHeight, params) => starGeometry(params).aabbHalfAxes,
  boundaryPoint: (rect, toward, params) => {
    const vertices = worldVertices(rect, starGeometry(params));
    const center = localToWorld(rect, [0, 0]);
    return boundaryFromContour(verticesToSegments(vertices), params.cornerRadius, center, toward) ?? center;
  },
  anchor: (rect, name: ShapeAnchorName, params) => {
    const geometry = starGeometry(params);
    const tip = /^tip-(\d+)$/.exec(name);
    if (tip) {
      const index = 2 * Number(tip[1]);
      return index < geometry.vertices.length ? localToWorld(rect, geometry.vertices[index]) : undefined;
    }
    const notch = /^notch-(\d+)$/.exec(name);
    if (notch) {
      const index = 2 * Number(notch[1]) + 1;
      return index < geometry.vertices.length ? localToWorld(rect, geometry.vertices[index]) : undefined;
    }
    return undefined;
  },
  connectionEnvelope: (_rect, kind, params) => pointsConnectionEnvelope(starGeometry(params).vertices, kind),
  *emit(rect, style, round, params): Iterable<ScenePrimitive> {
    const commands = contourToPathCommands(
      contourCommands(verticesToSegments(worldVertices(rect, starGeometry(params))), params.cornerRadius),
      round,
    );
    yield contourToPathPrimitive(commands, style);
  },
  scaleParams: (params, scaleX, scaleY) => {
    const factor = Math.sqrt(scaleX * scaleY);
    return {
      ...params,
      innerRadius: params.innerRadius * factor,
      outerRadius: params.outerRadius * factor,
      ...(params.cornerRadius === undefined ? {} : { cornerRadius: params.cornerRadius * factor }),
    };
  },
});

const makeStarShapeDefinition = () => StarShapeDefinition;

/** Star 的静态 Core provider */
export const StarShapeProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'shape', name: StarShapeDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeStarShapeDefinition,
});
