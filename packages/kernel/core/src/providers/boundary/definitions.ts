import { z } from 'zod';

import type { BoundaryDefinition } from '../../contract';
import type { BuiltinShapeValue } from '../../schemas';

import { defineBoundary } from '../../contract';
import { BuiltinShape } from '../../schemas';
import { defineBuiltinProviderArray } from '../registry';
import { ellipseShape, rectangle } from '../shape';

const NO_PARAMS = z.strictObject({});

const squareToMax = (rect: Parameters<BoundaryDefinition['boundaryPoint']>[0]) => {
  const side = Math.max(rect.width, rect.height);
  return { x: rect.x, y: rect.y, width: side, height: side, rotate: rect.rotate };
};

export type BuiltinBoundaryProviderName = Extract<
  BuiltinShapeValue,
  typeof BuiltinShape.Circle | typeof BuiltinShape.Rectangle | typeof BuiltinShape.Ellipse
>;

/** 圆形连接面：通过最大边正方形复用 ellipse shape 几何。 */
const circleBoundary = defineBoundary({
  name: BuiltinShape.Circle,
  paramsSchema: NO_PARAMS,
  boundaryPoint: (rect, toward, params) => ellipseShape.boundaryPoint(squareToMax(rect), toward, params),
  anchor: (rect, name, params) => ellipseShape.anchor(squareToMax(rect), name, params),
});

/** 矩形连接面：直接复用 rectangle shape 的连接面实现。 */
const rectangleBoundary = defineBoundary({
  name: BuiltinShape.Rectangle,
  paramsSchema: NO_PARAMS,
  boundaryPoint: rectangle.boundaryPoint,
  anchor: rectangle.anchor,
});

/** 椭圆连接面：直接复用 ellipse shape 的连接面实现。 */
const ellipseBoundary = defineBoundary({
  name: BuiltinShape.Ellipse,
  paramsSchema: NO_PARAMS,
  boundaryPoint: ellipseShape.boundaryPoint,
  anchor: ellipseShape.anchor,
});

/** 内置 boundary provider 注册项。 */
export const BUILTIN_BOUNDARIES = defineBuiltinProviderArray<BoundaryDefinition, BuiltinBoundaryProviderName>([
  circleBoundary,
  rectangleBoundary,
  ellipseBoundary,
]);
