import type { CoreDependencyProvider } from '@retikz/core';
import type { Position } from '@retikz/math';
import type { infer as ZodInfer } from 'zod';

import { defineShape } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { strictObject } from 'zod';

import { StandardShapeName } from '../constants';
import {
  circumscribeRoundedPolygon,
  emitPolygon,
  polygonAnchor,
  polygonBoundaryPoint,
  polygonConnectionEnvelope,
} from './_utils';

const HexagonShapeParamsSchema = strictObject({
  shoulderDepth: NonNegativeNumberSchema.optional().describe('Horizontal depth of each shoulder in user units.'),
  cornerRadius: NonNegativeNumberSchema.optional().describe('Uniform corner radius in user units.'),
});

/** Hexagon 形状参数 */
export type HexagonShapeParams = ZodInfer<typeof HexagonShapeParamsSchema>;

const shoulderDepthOf = (params: HexagonShapeParams): number => params.shoulderDepth ?? 12;

/** 将肩深限制在最终半宽内以保持顶点顺序 */
const effectiveShoulderDepth = (halfWidth: number, params: HexagonShapeParams): number =>
  Math.min(halfWidth, shoulderDepthOf(params));

/** 根据最终外接矩形生成长六边形局部顶点 */
const hexagonVertices =
  (params: HexagonShapeParams) =>
  (halfWidth: number, halfHeight: number): Array<Position> => {
    const shoulderDepth = effectiveShoulderDepth(halfWidth, params);
    const innerX = halfWidth - shoulderDepth;
    return [
      [-innerX, -halfHeight],
      [innerX, -halfHeight],
      [halfWidth, 0],
      [innerX, halfHeight],
      [-innerX, halfHeight],
      [-halfWidth, 0],
    ];
  };

/** 可选 Hexagon 形状 Definition */
export const HexagonShapeDefinition = defineShape<HexagonShapeParams>({
  name: StandardShapeName.Hexagon,
  paramsSchema: HexagonShapeParamsSchema,
  circumscribe: (innerHalfWidth, innerHalfHeight, params) => {
    const sharp = { halfWidth: innerHalfWidth + shoulderDepthOf(params), halfHeight: innerHalfHeight };
    return circumscribeRoundedPolygon(
      StandardShapeName.Hexagon,
      innerHalfWidth,
      innerHalfHeight,
      sharp,
      params.cornerRadius,
      hexagonVertices(params),
    );
  },
  boundaryPoint: (bounds, toward, params) =>
    polygonBoundaryPoint(bounds, toward, params.cornerRadius, hexagonVertices(params)),
  anchor: polygonAnchor,
  connectionEnvelope: (bounds, kind, params) => polygonConnectionEnvelope(bounds, kind, hexagonVertices(params)),
  emit: (bounds, style, round, params) =>
    emitPolygon(bounds, style, round, params.cornerRadius, hexagonVertices(params)),
  scaleParams: (params, scaleX, scaleY) => ({
    ...params,
    ...(params.shoulderDepth === undefined ? {} : { shoulderDepth: params.shoulderDepth * Math.sqrt(scaleX * scaleY) }),
    ...(params.cornerRadius === undefined ? {} : { cornerRadius: params.cornerRadius * Math.sqrt(scaleX * scaleY) }),
  }),
});

/** Hexagon 的静态 Core provider */
export const HexagonShapeProvider: CoreDependencyProvider = Object.freeze({
  key: { capability: 'shape', name: HexagonShapeDefinition.name },
  dependencies: [],
  datasets: {},
  makeDefinition: () => HexagonShapeDefinition,
});
