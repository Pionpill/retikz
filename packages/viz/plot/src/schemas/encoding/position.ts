import type { ValueOf } from '@retikz/foundation';
import { NonBlankStringSchema } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';
import { enum as zodEnum, never, number, strictObject, union } from 'zod';

/** 位置输入引用的最终坐标角色范围边界 */
export const PositionEdge = {
  /** 最终映射范围的起点，跟随范围反转 */
  Start: 'start',
  /** 最终映射范围的终点，跟随范围反转 */
  End: 'end',
} as const;

export type PositionEdge = ValueOf<typeof PositionEdge>;

/**
 * 校验字段、数据空间常量或最终坐标范围边缘，三类输入互斥
 * @description field 与 value 经坐标角色的比例尺映射；edge 直接引用最终范围端点，不表示数据域的最小值或最大值
 */
export const PositionInputSchema = union([
  strictObject({ field: NonBlankStringSchema.describe('Field path in the final mark data view') }),
  strictObject({ value: union([number(), NonBlankStringSchema]).describe('Constant data-space value') }),
  strictObject({ edge: zodEnum(PositionEdge).describe('Boundary of the final coordinate role range') }),
]).describe('Exclusive field, constant value, or coordinate range edge');

/** 校验仅提供 x 的一维位置，不允许提供 y、z */
export const Position1DEncodingSchema = strictObject({
  x: PositionInputSchema,
  y: never().optional(),
  z: never().optional(),
}).describe('One-dimensional position: x is required; y and z are not allowed');

/** 校验依次包含 x、y 的二维位置 */
export const Position2DEncodingSchema = strictObject({
  x: PositionInputSchema,
  y: PositionInputSchema,
  z: never().optional(),
}).describe('Two-dimensional position: x and y are required; z is not allowed');

/** 校验依次包含 x、y、z 的三维位置 */
export const Position3DEncodingSchema = strictObject({
  x: PositionInputSchema,
  y: PositionInputSchema,
  z: PositionInputSchema,
}).describe('Three-dimensional position: x, y and z are required');

/** 校验一至三维位置，坐标角色必须从 x 开始连续提供 */
export const PositionEncodingSchema = union([
  Position1DEncodingSchema,
  Position2DEncodingSchema,
  Position3DEncodingSchema,
]).describe('Position inputs with consecutive roles: x, x/y, or x/y/z');

/** 字段、数据空间常量或最终范围边缘的位置输入 */
export type IRPlotPositionInput = ZodInfer<typeof PositionInputSchema>;

/** 一维位置编码，x 必填，不允许提供 y、z */
export type IRPlotPosition1DEncoding = ZodInfer<typeof Position1DEncodingSchema>;

/** 二维位置编码，x、y 必填，不允许提供 z */
export type IRPlotPosition2DEncoding = ZodInfer<typeof Position2DEncodingSchema>;

/** 三维位置编码，x、y、z 均必填 */
export type IRPlotPosition3DEncoding = ZodInfer<typeof Position3DEncodingSchema>;

/** 从 x 开始连续提供坐标角色的一至三维位置绑定 */
export type IRPlotPositionEncoding = ZodInfer<typeof PositionEncodingSchema>;
