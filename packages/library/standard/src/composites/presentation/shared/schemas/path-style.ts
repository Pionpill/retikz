import { PathBaseSchema } from '@retikz/core';

/** Standard composite 复用的闭合 Path 描边样式 */
export const StandardPathStrokeStyleSchema = PathBaseSchema.pick({
  color: true,
  stroke: true,
  strokeWidth: true,
  dashPattern: true,
  dashOffset: true,
  lineCap: true,
  lineJoin: true,
  opacity: true,
  strokeOpacity: true,
  zIndex: true,
});

/** Standard composite 复用的闭合 Path 边框样式 */
export const StandardPathBorderStyleSchema = StandardPathStrokeStyleSchema.extend({
  fill: PathBaseSchema.shape.fill,
  fillOpacity: PathBaseSchema.shape.fillOpacity,
  fillRule: PathBaseSchema.shape.fillRule,
});
