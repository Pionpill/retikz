import { PaintValueSchema, ScopeSchema } from '@retikz/core';
import { strictObject } from 'zod';

import { TableCellBordersSchema } from '../border';

export const TableCellBackgroundSchema = strictObject({
  fill: PaintValueSchema.describe('Paint filling the Table Cell box.'),
  fillOpacity: ScopeSchema.shape.style
    .unwrap()
    .shape.fillOpacity.describe('Cell background fill opacity. Omitted fields use 1 at runtime.'),
}).describe('Background painted inside a resolved Table Cell box.');

export const TableCellContentStyleSchema = ScopeSchema.pick({ style: true, defaults: true }).describe(
  'Core Scope style defaults applied to Table Cell content before layout.',
);

export const TableCellAppearanceSchema = strictObject({
  background: TableCellBackgroundSchema.optional().describe('Optional paint for the resolved Table Cell box.'),
  content: TableCellContentStyleSchema.optional().describe('Optional Core Scope defaults for Cell content.'),
  borders: TableCellBordersSchema.optional().describe('Optional final per-side Border Graph candidates.'),
}).describe('Resolved visual appearance shared by Table Cell presentation and layout.');
