import { PaintValueSchema, ScopeSchema } from '@retikz/core';
import { strictObject } from 'zod';

import { TableCellBordersSchema } from '../border';

export const TableCellBackgroundSchema = strictObject({
  fill: PaintValueSchema.describe('Paint filling the Table Cell box.'),
  fillOpacity: ScopeSchema.shape.fillOpacity.describe('Cell background fill opacity. Omitted fields use 1 at runtime.'),
}).describe('Background painted inside a resolved Table Cell box.');

export const TableCellContentStyleSchema = strictObject({
  color: ScopeSchema.shape.color,
  fill: ScopeSchema.shape.fill,
  fillOpacity: ScopeSchema.shape.fillOpacity,
  stroke: ScopeSchema.shape.stroke,
  strokeWidth: ScopeSchema.shape.strokeWidth,
  strokeOpacity: ScopeSchema.shape.strokeOpacity,
  opacity: ScopeSchema.shape.opacity,
  nodeDefault: ScopeSchema.shape.nodeDefault,
  pathDefault: ScopeSchema.shape.pathDefault,
  labelDefault: ScopeSchema.shape.labelDefault,
  arrowDefault: ScopeSchema.shape.arrowDefault,
  resetStyle: ScopeSchema.shape.resetStyle,
}).describe('Core Scope style defaults applied to Table Cell content before layout.');

export const TableCellAppearanceSchema = strictObject({
  background: TableCellBackgroundSchema.optional().describe('Optional paint for the resolved Table Cell box.'),
  content: TableCellContentStyleSchema.optional().describe('Optional Core Scope defaults for Cell content.'),
  borders: TableCellBordersSchema.optional().describe('Optional final per-side Border Graph candidates.'),
}).describe('Resolved visual appearance shared by Table Cell presentation and layout.');
