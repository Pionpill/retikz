import { NonNegativeNumberSchema } from '@retikz/foundation';
import { array, enum as zodEnum, number, strictObject } from 'zod';

import { PathLineCap, PathLineJoin } from './constants';

/** 校验由非负长度构成的非空虚线序列，长度采用用户单位 */
export const StrokeDashPatternSchema = array(NonNegativeNumberSchema)
  .min(1)
  .describe('Stroke dash pattern lengths in user units.');

/** 校验用户单位下的虚线相位偏移，允许有限负值 */
export const StrokeDashOffsetSchema = number().describe(
  'Stroke dash offset in user units. Positive and negative finite values are allowed.',
);

/** 校验路径端点的线帽形状关键字 */
export const PathLineCapSchema = zodEnum(PathLineCap).describe('Path stroke endpoint cap keyword.');

/** 校验路径拐角的连接样式关键字 */
export const PathLineJoinSchema = zodEnum(PathLineJoin).describe('Path stroke corner join keyword.');

/** 校验用户单位下的非负描边宽度 */
export const StrokeWidthSchema = NonNegativeNumberSchema.describe('Stroke width in user units.');

/** 校验可绘制几何共用的线宽、虚线序列和相位偏移 */
export const StrokeStyleSchema = strictObject({
  strokeWidth: StrokeWidthSchema.optional().describe('Stroke width in user units.'),
  dashPattern: StrokeDashPatternSchema.optional().describe(
    'Stroke dash pattern lengths in user units. Omitted fields mean solid line.',
  ),
  dashOffset: StrokeDashOffsetSchema.optional().describe(
    'Stroke dash offset in user units. Positive and negative finite values are allowed.',
  ),
}).describe('Shared stroke style fields for drawable geometry.');

/** 校验路径端点线帽与拐角连接样式 */
export const StrokeCapJoinSchema = strictObject({
  lineCap: PathLineCapSchema.optional().describe(
    'Stroke endpoint shape. Omitted fields use butt; round adds a half-disc cap and square extends past the endpoint.',
  ),
  lineJoin: PathLineJoinSchema.optional().describe(
    'Stroke corner shape. Omitted fields use miter; round rounds the join and bevel cuts the corner flat.',
  ),
}).describe('Stroke endpoint caps and corner joins.');
