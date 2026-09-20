import { ChildSchema, NodeStyleSchema, ScopePropsSchema } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { literal, strictObject, string, union } from 'zod';

import { SurfaceSchema } from '../../surface/schemas';
import { StandardPathStrokeStyleSchema } from './path-style';

export const CellStyleSchema = StandardPathStrokeStyleSchema.omit({ zIndex: true })
  .extend({
    fill: NodeStyleSchema.shape.fill,
    fillOpacity: NodeStyleSchema.shape.fillOpacity,
    font: NodeStyleSchema.shape.font,
    textColor: NodeStyleSchema.shape.textColor,
    cornerRadius: SurfaceSchema.shape.cornerRadius.removeDefault().optional(),
  })
  .describe('Sparse visual overrides for a List or Map cell.');

export const CellLayoutSchema = strictObject({
  width: union([NonNegativeNumberSchema, literal('auto')])
    .optional()
    .describe('Fixed cell border-box width; auto uses the structure natural sizing.'),
  height: union([NonNegativeNumberSchema, literal('auto')])
    .optional()
    .describe('Fixed cell border-box height; auto uses the structure natural sizing.'),
  padding: SurfaceSchema.shape.padding.removeDefault().optional(),
  overflow: SurfaceSchema.shape.overflow.removeDefault().optional(),
}).describe('Sparse cell dimensions, padding and overflow overrides.');

export const CellSchema = strictObject({
  id: ScopePropsSchema.shape.id,
  content: union([string(), ChildSchema]).describe(
    'Text or one drawable child, including registered third-party composites.',
  ),
  style: CellStyleSchema.optional(),
  layout: CellLayoutSchema.optional(),
}).describe('A drawable cell with optional allocation identity.');

export const CellDefaultsSchema = CellStyleSchema.extend({
  fill: CellStyleSchema.shape.fill.default('gray'),
  fillOpacity: CellStyleSchema.shape.fillOpacity.default(0.14),
  stroke: CellStyleSchema.shape.stroke.default('none'),
  cornerRadius: CellStyleSchema.shape.cornerRadius.default(0),
}).describe('Resolved base cell visual defaults.');

/** Map 键角色的最低优先级视觉默认，继承合并后应用 */
export const KeyCellDefaultsSchema = CellDefaultsSchema.extend({
  fillOpacity: CellDefaultsSchema.shape.fillOpacity.default(0.4),
});

export const CellLayoutDefaultsSchema = CellLayoutSchema.extend({
  padding: CellLayoutSchema.shape.padding.default(8),
  overflow: CellLayoutSchema.shape.overflow.default('visible'),
}).describe('Base cell layout defaults applied after inheritance.');
