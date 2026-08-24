import { enum as zodEnum, number, strictObject } from 'zod';

import type { BoundaryDefinition } from '../../contract';
import type { BoundaryFitValue, BuiltinShapeValue } from '../../schemas';
import type { Rect } from '../../shared';

import { defineBoundary } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { BoundaryFit, BuiltinShape } from '../../schemas';
import { defineBuiltinProviderArray } from '../registry/index';
import { ellipseShape, rectangle } from '../shape';

const builtinBoundaryParamsSchema = strictObject({
  fit: zodEnum(BoundaryFit)
    .optional()
    .default(BoundaryFit.Tight)
    .describe('How the regular boundary fits the visual shape: shape-aware tight envelope or AABB bounds.'),
  gap: number().optional().default(0).describe('Signed user-unit gap added to the fitted radius or both half-axes.'),
});

type BuiltinBoundaryParams = { fit: BoundaryFitValue; gap: number };

/** 用指定半轴替换 rect 尺寸，并在 fit 后应用有符号 gap */
const withGap = (rect: Rect, halfWidth: number, halfHeight: number, gap: number, provider: string): Rect => {
  const effectiveHalfWidth = halfWidth + gap;
  const effectiveHalfHeight = halfHeight + gap;
  if (effectiveHalfWidth <= 0 || effectiveHalfHeight <= 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Provider,
      `${provider} boundary gap ${gap} produced a non-positive half-axis from [${halfWidth}, ${halfHeight}]`,
    );
  }
  return { ...rect, width: effectiveHalfWidth * 2, height: effectiveHalfHeight * 2 };
};

/** 按 visual AABB 返回规则圆半轴 */
const boundsCircleHalfAxes = (rect: Rect): { halfWidth: number; halfHeight: number } => {
  const radius = Math.hypot(rect.width / 2, rect.height / 2);
  return { halfWidth: radius, halfHeight: radius };
};

/** 按 visual AABB 返回四角外接椭圆半轴 */
const boundsEllipseHalfAxes = (rect: Rect): { halfWidth: number; halfHeight: number } => ({
  halfWidth: (rect.width / 2) * Math.SQRT2,
  halfHeight: (rect.height / 2) * Math.SQRT2,
});

export type BuiltinBoundaryProviderName = Extract<
  BuiltinShapeValue,
  typeof BuiltinShape.Circle | typeof BuiltinShape.Rectangle | typeof BuiltinShape.Ellipse
>;

/** 圆形连接面：通过视觉外接矩形的外接圆复用 ellipse shape 几何 */
const circleBoundary = defineBoundary({
  name: BuiltinShape.Circle,
  paramsSchema: builtinBoundaryParamsSchema,
  resolveRect: (context, params: BuiltinBoundaryParams) => {
    const base = params.fit === BoundaryFit.Tight ? context.connectionEnvelope('circle') : context.visualRect;
    const halfAxes =
      params.fit === BoundaryFit.Tight
        ? { halfWidth: base.width / 2, halfHeight: base.height / 2 }
        : boundsCircleHalfAxes(base);
    return withGap(base, halfAxes.halfWidth, halfAxes.halfHeight, params.gap, BuiltinShape.Circle);
  },
  boundaryPoint: ellipseShape.boundaryPoint,
  anchor: ellipseShape.anchor,
});

/** 矩形连接面：直接复用 rectangle shape 的连接面实现 */
const rectangleBoundary = defineBoundary({
  name: BuiltinShape.Rectangle,
  paramsSchema: builtinBoundaryParamsSchema,
  resolveRect: (context, params: BuiltinBoundaryParams) =>
    withGap(
      context.visualRect,
      context.visualRect.width / 2,
      context.visualRect.height / 2,
      params.gap,
      BuiltinShape.Rectangle,
    ),
  boundaryPoint: rectangle.boundaryPoint,
  anchor: rectangle.anchor,
});

/** 椭圆连接面：通过视觉外接矩形的外接椭圆复用 ellipse shape 几何 */
const ellipseBoundary = defineBoundary({
  name: BuiltinShape.Ellipse,
  paramsSchema: builtinBoundaryParamsSchema,
  resolveRect: (context, params: BuiltinBoundaryParams) => {
    const base = params.fit === BoundaryFit.Tight ? context.connectionEnvelope('ellipse') : context.visualRect;
    const halfAxes =
      params.fit === BoundaryFit.Tight
        ? { halfWidth: base.width / 2, halfHeight: base.height / 2 }
        : boundsEllipseHalfAxes(base);
    return withGap(base, halfAxes.halfWidth, halfAxes.halfHeight, params.gap, BuiltinShape.Ellipse);
  },
  boundaryPoint: ellipseShape.boundaryPoint,
  anchor: ellipseShape.anchor,
});

/** 内置 boundary provider 注册项 */
export const BUILTIN_BOUNDARIES = defineBuiltinProviderArray<BoundaryDefinition, BuiltinBoundaryProviderName>([
  circleBoundary,
  rectangleBoundary,
  ellipseBoundary,
]);
