import {
  DrawableInstanceSchema,
  GraphicOpacitySchema,
  GraphicPaintSchema,
  PathFillSchema,
  PathStrokeSchema,
} from '@retikz/core';
import { strictObject } from 'zod';

/** Standard composite 复用的闭合 Path 描边样式 */
export const StandardPathStrokeStyleSchema = strictObject({
  color: GraphicPaintSchema.shape.color,
  stroke: GraphicPaintSchema.shape.stroke,
  ...PathStrokeSchema.shape,
  opacity: GraphicOpacitySchema.shape.opacity,
  strokeOpacity: GraphicOpacitySchema.shape.strokeOpacity,
  zIndex: DrawableInstanceSchema.shape.zIndex,
}).describe('Standard presentation stroke style composed from Core graphic and path fragments.');

/** Standard composite 复用的闭合 Path 边框样式 */
export const StandardPathBorderStyleSchema = strictObject({
  ...StandardPathStrokeStyleSchema.shape,
  fill: GraphicPaintSchema.shape.fill,
  fillOpacity: GraphicOpacitySchema.shape.fillOpacity,
  fillRule: PathFillSchema.shape.fillRule,
}).describe('Standard presentation border style composed from Core graphic, stroke, and fill fragments.');
