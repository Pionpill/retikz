import { FontSchema, NodeDefaultSchema, PaintValueSchema, ScopeSchema } from '@retikz/core';
import { strictObject, union } from 'zod';

import { TableCellBordersDefaultsSchema, TableCellBordersSchema } from '../border';

const requireAtLeastOneField = (label: string) => ({
  message: `${label} must contain at least one field.`,
});

export const TableCellBackgroundSchema = strictObject({
  fill: PaintValueSchema.describe('Paint filling the Table Cell box.'),
  fillOpacity: ScopeSchema.shape.style
    .unwrap()
    .shape.fillOpacity.describe('Cell background fill opacity. Omitted fields use 1 at runtime.'),
}).describe('Background painted inside a resolved Table Cell box.');

export const TableCellBackgroundDefaultsSchema = strictObject({
  fill: PaintValueSchema.nullable().optional().describe('Optional background paint; null removes lower defaults.'),
  fillOpacity: ScopeSchema.shape.style
    .unwrap()
    .shape.fillOpacity.nullable()
    .optional()
    .describe('Optional background fill opacity; null removes lower defaults.'),
})
  .refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table Cell background defaults'))
  .describe('Sparse background defaults for an existing Table Cell box.');

const TableCellContentStyleDefaultsStyleSchema = strictObject({
  color: ScopeSchema.shape.style.unwrap().shape.color.nullable().optional(),
  fill: ScopeSchema.shape.style.unwrap().shape.fill.nullable().optional(),
  fillOpacity: ScopeSchema.shape.style.unwrap().shape.fillOpacity.nullable().optional(),
  stroke: ScopeSchema.shape.style.unwrap().shape.stroke.nullable().optional(),
  strokeWidth: ScopeSchema.shape.style.unwrap().shape.strokeWidth.nullable().optional(),
  strokeOpacity: ScopeSchema.shape.style.unwrap().shape.strokeOpacity.nullable().optional(),
  opacity: ScopeSchema.shape.style.unwrap().shape.opacity.nullable().optional(),
})
  .refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table Cell content style defaults'))
  .describe('Sparse Core Scope style defaults for Table Cell content.');

const TableCellNullableFontSchema = strictObject({
  family: FontSchema.shape.family.nullable().optional(),
  size: FontSchema.shape.size.nullable().optional(),
  weight: FontSchema.shape.weight.nullable().optional(),
  style: FontSchema.shape.style.nullable().optional(),
})
  .refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table Cell font defaults'))
  .describe('Sparse Core font defaults whose null leaves clear lower Table defaults.');

const TableCellNodeDefaultsSchema = NodeDefaultSchema.refine(
  value => Object.keys(value).length > 0,
  requireAtLeastOneField('Table Cell Node defaults'),
);

const TableCellNodeDefaultsWithNullableFontSchema = NodeDefaultSchema.extend({
  style: NodeDefaultSchema.shape.style
    .unwrap()
    .extend({ font: TableCellNullableFontSchema.optional() })
    .refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table Cell Node style defaults')),
})
  .refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table Cell Node defaults'))
  .describe('Table Cell Node defaults with leaf-level font clearing.');

const TableCellLabelDefaultsSchema = ScopeSchema.shape.defaults
  .unwrap()
  .shape.label.unwrap()
  .extend({ font: TableCellNullableFontSchema.optional() })
  .refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table Cell Label defaults'))
  .describe('Table Cell Label defaults with leaf-level font clearing.');

const TableCellScopeDefaultsSchema = strictObject({
  node: union([TableCellNodeDefaultsSchema, TableCellNodeDefaultsWithNullableFontSchema]).nullable().optional(),
  path: ScopeSchema.shape.defaults.unwrap().shape.path.nullable().optional(),
  label: TableCellLabelDefaultsSchema.nullable().optional(),
  arrow: ScopeSchema.shape.defaults.unwrap().shape.arrow.nullable().optional(),
  reset: ScopeSchema.shape.defaults.unwrap().shape.reset.nullable().optional(),
})
  .refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table Cell Scope defaults'))
  .describe('Sparse Core Scope descendant defaults for Table Cell content.');

const TableCellContentStyleDefaultsSchema = strictObject({
  style: TableCellContentStyleDefaultsStyleSchema.nullable().optional(),
  defaults: TableCellScopeDefaultsSchema.nullable().optional(),
})
  .refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table Cell content defaults'))
  .describe('Sparse Core Scope defaults applied to Table Cell content.');

export const TableCellContentStyleSchema = ScopeSchema.pick({ style: true, defaults: true }).describe(
  'Core Scope style defaults applied to Table Cell content before layout.',
);

export const TableCellAppearanceSchema = strictObject({
  background: TableCellBackgroundSchema.optional().describe('Optional paint for the resolved Table Cell box.'),
  content: TableCellContentStyleSchema.optional().describe('Optional Core Scope defaults for Cell content.'),
  borders: TableCellBordersSchema.optional().describe('Optional final per-side Border Graph candidates.'),
}).describe('Resolved visual appearance shared by Table Cell presentation and layout.');

export const TableCellAppearanceDefaultsSchema = strictObject({
  background: TableCellBackgroundDefaultsSchema.nullable().optional().describe('Sparse background defaults.'),
  content: TableCellContentStyleDefaultsSchema.nullable()
    .optional()
    .describe('Sparse Core Scope defaults for Cell content.'),
  borders: TableCellBordersDefaultsSchema.nullable().optional().describe('Sparse physical-side border defaults.'),
})
  .refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table Cell appearance defaults'))
  .describe('Sparse appearance defaults for an existing Table Cell.');

export const TableAppearanceDefaultsSchema = strictObject({
  body: TableCellAppearanceDefaultsSchema.nullable().optional().describe('Sparse defaults for existing body Cells.'),
  columnHeader: TableCellAppearanceDefaultsSchema.nullable()
    .optional()
    .describe('Sparse defaults for existing column-header Cells.'),
})
  .refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table appearance defaults'))
  .describe('Sparse Table Cell appearance defaults grouped by existing Cell location.');
