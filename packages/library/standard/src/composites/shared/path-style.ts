import {
  CssColorSchema,
  OpacitySchema,
  PaintValueSchema,
  PathFillRuleSchema,
  PathLineCapSchema,
  PathLineJoinSchema,
} from '@retikz/core';
import { z } from 'zod';

/** Standard composite 复用的闭合 Path 描边样式 */
export const StandardPathStrokeStyleSchema = z.strictObject({
  color: CssColorSchema.optional().describe('Master color for the lowered path.'),
  stroke: PaintValueSchema.optional().describe('Stroke paint for the lowered path.'),
  strokeWidth: z.number().finite().nonnegative().optional().describe('Stroke width in user units.'),
  dashPattern: z.array(z.number().finite().nonnegative()).min(1).optional().describe('Stroke dash pattern lengths.'),
  dashOffset: z.number().finite().optional().describe('Stroke dash offset in user units.'),
  lineCap: PathLineCapSchema.optional().describe('Stroke endpoint cap.'),
  lineJoin: PathLineJoinSchema.optional().describe('Stroke corner join.'),
  opacity: OpacitySchema.optional().describe('Whole-path opacity.'),
  strokeOpacity: OpacitySchema.optional().describe('Stroke-only opacity.'),
  zIndex: z.number().int().optional().describe('Sibling stacking order for the lowered path.'),
});

/** Standard composite 复用的闭合 Path 边框样式 */
export const StandardPathBorderStyleSchema = z.strictObject({
  ...StandardPathStrokeStyleSchema.shape,
  fill: PaintValueSchema.optional().describe('Fill paint for the lowered border path.'),
  fillOpacity: OpacitySchema.optional().describe('Fill-only opacity.'),
  fillRule: PathFillRuleSchema.optional().describe('Fill rule for the lowered border path.'),
});
