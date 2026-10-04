import {
  DrawableInstanceSchema,
  GraphicColorSchema,
  GraphicElementOpacitySchema,
  GraphicFillSchema,
  GraphicStrokeSchema,
  PathFillSchema,
  PathStrokeSchema,
} from '@retikz/core';
import { strictObject } from 'zod';

/** Standard composite 复用的闭合 Path 描边样式 */
export const StandardPathStrokeStyleSchema = strictObject({
  ...GraphicColorSchema.shape,
  ...GraphicElementOpacitySchema.shape,
  ...GraphicStrokeSchema.shape,
  ...PathStrokeSchema.shape,
  zIndex: DrawableInstanceSchema.shape.zIndex,
}).describe('Standard presentation stroke style composed from Core graphic and path fragments.');

/** Standard composite 复用的闭合 Path 边框样式 */
export const StandardPathBorderStyleSchema = strictObject({
  ...StandardPathStrokeStyleSchema.shape,
  ...GraphicFillSchema.shape,
  ...PathFillSchema.shape,
}).describe('Standard presentation border style composed from Core graphic, stroke, and fill fragments.');
