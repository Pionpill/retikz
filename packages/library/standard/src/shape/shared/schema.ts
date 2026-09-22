import { PathBaseSchema, PositionSchema } from '@retikz/core';
import { NonNegativeNumberSchema, PositiveNumberSchema } from '@retikz/foundation';
import { enum as zodEnum, number, strictObject, union } from 'zod';
import type { RefinementCtx, input as ZodInput } from 'zod';

/** 形状复用的完整 Path 实例与呈现字段 */
export const ShapePathSchema = PathBaseSchema.omit({ type: true, kind: true, kindOptions: true, children: true });
/** 盒拟合策略及其默认值 */
export const ShapeFitSchema = zodEnum(['contain', 'cover']).default('contain');
/** 局部圆弧闭合策略 */
export const ShapeClosedSchema = zodEnum(['open', 'chord', 'sector']).default('chord');
/** 开放弧闭合策略 */
export const ShapeArcCloseSchema = zodEnum(['open', 'chord', 'sector']).default('open');
/** 星形内半径比例 */
export const ShapeInnerRatioSchema = number().min(0).max(1).default(0.5);
/** 首顶点的默认方向 */
export const ShapeVertexAngleSchema = number().default(-90);
/** 形状拟合的轴对齐盒 */
export const ShapeBoxSchema = union([
  strictObject({ x: number(), y: number(), width: PositiveNumberSchema, height: PositiveNumberSchema }),
  strictObject({ origin: PositionSchema, width: PositiveNumberSchema, height: PositiveNumberSchema }),
]);
/** 角度字段，不在无角度完整轮廓上物化默认值 */
export const ShapeAnglesSchema = strictObject({
  startAngle: number().optional().describe('Start angle in degrees.'),
  endAngle: number().optional().describe('End angle in degrees.'),
  sweepAngle: number().optional().describe('Signed sweep in degrees; supply exactly two angle fields.'),
});
/** 盒调整字段 */
export const ShapeBoxAdjustmentSchema = strictObject({
  inset: NonNegativeNumberSchema.optional().describe('Uniform inward box adjustment.'),
  outset: NonNegativeNumberSchema.optional().describe('Uniform outward box adjustment.'),
});
/** 校验角度组合，完整轮廓允许不提供角度 */
export const refineShapeAngles = (
  input: ZodInput<typeof ShapeAnglesSchema> & { closed?: string },
  ctx: RefinementCtx,
  required = false,
): void => {
  const count = [input.startAngle, input.endAngle, input.sweepAngle].filter(value => value !== undefined).length;
  if (count !== 2 && (required || count !== 0))
    ctx.addIssue({ code: 'custom', path: ['startAngle'], message: 'Supply exactly two angle fields.' });
  if (count === 0 && input.closed !== undefined)
    ctx.addIssue({ code: 'custom', path: ['closed'], message: 'Partial closure requires angles.' });
};
/** 校验盒调整与调整后的非退化边界 */
export const refineShapeBox = (
  input: ZodInput<typeof ShapeBoxAdjustmentSchema> & {
    box?: ZodInput<typeof ShapeBoxSchema>;
    corner1?: [number, number];
    corner2?: [number, number];
  },
  ctx: RefinementCtx,
): void => {
  if (input.inset !== undefined && input.outset !== undefined)
    ctx.addIssue({ code: 'custom', path: ['inset'], message: 'Use inset or outset, not both.' });
  const width = input.box?.width ?? Math.abs((input.corner2?.[0] ?? 0) - (input.corner1?.[0] ?? 0));
  const height = input.box?.height ?? Math.abs((input.corner2?.[1] ?? 0) - (input.corner1?.[1] ?? 0));
  const delta = input.outset ?? -(input.inset ?? 0);
  if (width + 2 * delta <= 0 || height + 2 * delta <= 0)
    ctx.addIssue({ code: 'custom', path: ['inset'], message: 'Adjusted box must have positive dimensions.' });
};

/** 形状轴向半径，保留显式零值 */
export const ShapeRadiusAxesSchema = strictObject({ x: NonNegativeNumberSchema, y: NonNegativeNumberSchema });
/** 圆形或椭圆形半径 */
export const ShapeRadiusSchema = union([NonNegativeNumberSchema, ShapeRadiusAxesSchema]);
