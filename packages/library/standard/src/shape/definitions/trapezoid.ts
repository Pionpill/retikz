import type { CoreDependencyProvider, SideValue } from '@retikz/core';
import type { Position } from '@retikz/math';

import { defineShape, SideValues } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

import { StandardShapeName } from '../constants';
import {
  circumscribeRoundedPolygon,
  emitPolygon,
  polygonAnchor,
  polygonBoundaryPoint,
  polygonConnectionEnvelope,
} from './_utils';

const TrapezoidShapeParamsSchema = z.strictObject({
  shortSide: z.enum(SideValues).optional().describe('Side shorter than its opposite side; defaults to top.'),
  shortSideRatio: z
    .number()
    .positive()
    .max(1)
    .optional()
    .describe('Short-side length divided by opposite-side length.'),
  cornerRadius: NonNegativeNumberSchema.optional().describe('Uniform corner radius in user units.'),
});

/** Trapezoid 形状参数 */
export type TrapezoidShapeParams = z.infer<typeof TrapezoidShapeParamsSchema>;

const shortSideOf = (params: TrapezoidShapeParams): SideValue => params.shortSide ?? 'top';
const shortSideRatioOf = (params: TrapezoidShapeParams): number => params.shortSideRatio ?? 0.72;

/** 根据最终外接矩形生成 Trapezoid 局部顶点 */
const trapezoidVertices =
  (params: TrapezoidShapeParams) =>
  (halfWidth: number, halfHeight: number): Array<Position> => {
    const ratio = shortSideRatioOf(params);
    switch (shortSideOf(params)) {
      case 'top':
        return [
          [-halfWidth * ratio, -halfHeight],
          [halfWidth * ratio, -halfHeight],
          [halfWidth, halfHeight],
          [-halfWidth, halfHeight],
        ];
      case 'right':
        return [
          [-halfWidth, -halfHeight],
          [halfWidth, -halfHeight * ratio],
          [halfWidth, halfHeight * ratio],
          [-halfWidth, halfHeight],
        ];
      case 'bottom':
        return [
          [-halfWidth, -halfHeight],
          [halfWidth, -halfHeight],
          [halfWidth * ratio, halfHeight],
          [-halfWidth * ratio, halfHeight],
        ];
      case 'left':
        return [
          [-halfWidth, -halfHeight * ratio],
          [halfWidth, -halfHeight],
          [halfWidth, halfHeight],
          [-halfWidth, halfHeight * ratio],
        ];
    }
  };

/** 可选 Trapezoid 形状 Definition */
export const TrapezoidShapeDefinition = defineShape<TrapezoidShapeParams>({
  name: StandardShapeName.Trapezoid,
  paramsSchema: TrapezoidShapeParamsSchema,
  circumscribe: (innerHalfWidth, innerHalfHeight, params) => {
    const ratio = shortSideRatioOf(params);
    const sharp =
      shortSideOf(params) === 'top' || shortSideOf(params) === 'bottom'
        ? { halfWidth: innerHalfWidth / ratio, halfHeight: innerHalfHeight }
        : { halfWidth: innerHalfWidth, halfHeight: innerHalfHeight / ratio };
    return circumscribeRoundedPolygon(
      StandardShapeName.Trapezoid,
      innerHalfWidth,
      innerHalfHeight,
      sharp,
      params.cornerRadius,
      trapezoidVertices(params),
    );
  },
  boundaryPoint: (bounds, toward, params) =>
    polygonBoundaryPoint(bounds, toward, params.cornerRadius, trapezoidVertices(params)),
  anchor: polygonAnchor,
  connectionEnvelope: (bounds, kind, params) => polygonConnectionEnvelope(bounds, kind, trapezoidVertices(params)),
  emit: (bounds, style, round, params) =>
    emitPolygon(bounds, style, round, params.cornerRadius, trapezoidVertices(params)),
  scaleParams: (params, scaleX, scaleY) => ({
    ...params,
    ...(params.cornerRadius === undefined ? {} : { cornerRadius: params.cornerRadius * Math.sqrt(scaleX * scaleY) }),
  }),
});

/** Trapezoid 的静态 Core provider */
export const TrapezoidShapeProvider: CoreDependencyProvider = Object.freeze({
  key: { capability: 'shape', name: TrapezoidShapeDefinition.name },
  dependencies: [],
  datasets: {},
  makeDefinition: () => TrapezoidShapeDefinition,
});
