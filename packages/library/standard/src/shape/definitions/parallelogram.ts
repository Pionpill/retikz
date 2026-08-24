import type { CoreDependencyProvider } from '@retikz/core';
import type { Position } from '@retikz/math';
import type { infer as ZodInfer } from 'zod';

import { defineShape, DEG_TO_RAD } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { enum as zodEnum, number, strictObject } from 'zod';

import { StandardShapeName } from '../constants';
import {
  circumscribeRoundedPolygon,
  emitPolygon,
  polygonAnchor,
  polygonBoundaryPoint,
  polygonConnectionEnvelope,
} from './_utils';

const ParallelogramShapeParamsSchema = strictObject({
  slantDirection: zodEnum(['left', 'right']).optional().describe('Direction of the top-edge horizontal offset.'),
  slantAngle: number().positive().max(90).optional().describe('Angle between the slanted side and horizontal edge.'),
  cornerRadius: NonNegativeNumberSchema.optional().describe('Uniform corner radius in user units.'),
});

/** Parallelogram 形状参数 */
export type ParallelogramShapeParams = ZodInfer<typeof ParallelogramShapeParamsSchema>;

const directionOf = (params: ParallelogramShapeParams): 'left' | 'right' => params.slantDirection ?? 'right';
const angleOf = (params: ParallelogramShapeParams): number => params.slantAngle ?? 70;

/** 根据高度计算上下边的水平错位 */
const slantOffset = (halfHeight: number, params: ParallelogramShapeParams): number => {
  const angle = angleOf(params);
  if (angle === 90) return 0;
  const offset = (2 * halfHeight) / Math.tan(angle * DEG_TO_RAD);
  const integer = Math.round(offset);
  return Math.abs(offset - integer) <= 1e-12 * Math.max(1, Math.abs(offset)) ? integer : offset;
};

/** 根据最终外接矩形生成 Parallelogram 局部顶点 */
const parallelogramVertices =
  (params: ParallelogramShapeParams) =>
  (halfWidth: number, halfHeight: number): Array<Position> => {
    const offset = slantOffset(halfHeight, params);
    if (directionOf(params) === 'right') {
      return [
        [-halfWidth + offset, -halfHeight],
        [halfWidth, -halfHeight],
        [halfWidth - offset, halfHeight],
        [-halfWidth, halfHeight],
      ];
    }
    return [
      [-halfWidth, -halfHeight],
      [halfWidth - offset, -halfHeight],
      [halfWidth, halfHeight],
      [-halfWidth + offset, halfHeight],
    ];
  };

/** 可选 Parallelogram 形状 Definition */
export const ParallelogramShapeDefinition = defineShape<ParallelogramShapeParams>({
  name: StandardShapeName.Parallelogram,
  paramsSchema: ParallelogramShapeParamsSchema,
  circumscribe: (innerHalfWidth, innerHalfHeight, params) => {
    const sharp = {
      halfWidth: innerHalfWidth + Math.abs(slantOffset(innerHalfHeight, params)),
      halfHeight: innerHalfHeight,
    };
    return circumscribeRoundedPolygon(
      StandardShapeName.Parallelogram,
      innerHalfWidth,
      innerHalfHeight,
      sharp,
      params.cornerRadius,
      parallelogramVertices(params),
    );
  },
  boundaryPoint: (bounds, toward, params) =>
    polygonBoundaryPoint(bounds, toward, params.cornerRadius, parallelogramVertices(params)),
  anchor: polygonAnchor,
  connectionEnvelope: (bounds, kind, params) => polygonConnectionEnvelope(bounds, kind, parallelogramVertices(params)),
  emit: (bounds, style, round, params) =>
    emitPolygon(bounds, style, round, params.cornerRadius, parallelogramVertices(params)),
  scaleParams: (params, scaleX, scaleY) => ({
    ...params,
    ...(params.cornerRadius === undefined ? {} : { cornerRadius: params.cornerRadius * Math.sqrt(scaleX * scaleY) }),
  }),
});

/** Parallelogram 的静态 Core provider */
export const ParallelogramShapeProvider: CoreDependencyProvider = Object.freeze({
  key: { capability: 'shape', name: ParallelogramShapeDefinition.name },
  dependencies: [],
  datasets: {},
  makeDefinition: () => ParallelogramShapeDefinition,
});
