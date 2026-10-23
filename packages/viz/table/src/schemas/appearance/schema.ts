import {
  CascadingGraphicStyleSchema,
  OpacitySchema,
  FontSchema,
  NodeDefaultSchema,
  PathDefaultSchema,
  NodeLabelDefaultSchema,
  PathLabelDefaultSchema,
  PaintValueSchema,
  ScopeSchema,
} from '@retikz/core';
import { strictObject } from 'zod';

import { TableCellBordersDefaultsSchema, TableCellBordersSchema } from '../border';

const requireAtLeastOneField = (label: string) => ({
  message: `${label} must contain at least one field.`,
});

/** 校验在单元格边界内绘制的背景填充与透明度 */
export const TableCellBackgroundSchema = strictObject({
  fill: PaintValueSchema.describe('Paint filling the Table Cell box.'),
  fillOpacity: OpacitySchema.optional().describe('Cell background fill opacity. Omitted fields use 1 at runtime.'),
}).describe('Background painted inside a resolved Table Cell box.');

/** 校验既有单元格的稀疏背景默认值，null 用于清除下层默认 */
export const TableCellBackgroundDefaultsSchema = strictObject({
  fill: PaintValueSchema.nullable().optional().describe('Optional background paint; null removes lower defaults.'),
  fillOpacity: OpacitySchema.optional()
    .nullable()
    .optional()
    .describe('Optional background fill opacity; null removes lower defaults.'),
})
  .refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table Cell background defaults'))
  .describe('Sparse background defaults for an existing Table Cell box.');

const TableCellContentStyleDefaultsStyleSchema = strictObject({
  color: CascadingGraphicStyleSchema.shape.color.nullable().optional(),
  fill: CascadingGraphicStyleSchema.shape.fill.nullable().optional(),
  stroke: CascadingGraphicStyleSchema.shape.stroke.nullable().optional(),
  strokeWidth: CascadingGraphicStyleSchema.shape.strokeWidth.nullable().optional(),
  opacity: CascadingGraphicStyleSchema.shape.opacity.nullable().optional(),
  dashPattern: CascadingGraphicStyleSchema.shape.dashPattern.nullable().optional(),
  dashOffset: CascadingGraphicStyleSchema.shape.dashOffset.nullable().optional(),
  lineCap: CascadingGraphicStyleSchema.shape.lineCap.nullable().optional(),
  lineJoin: CascadingGraphicStyleSchema.shape.lineJoin.nullable().optional(),
  shadow: CascadingGraphicStyleSchema.shape.shadow.nullable().optional(),
  blendMode: CascadingGraphicStyleSchema.shape.blendMode.nullable().optional(),
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

const TableCellNodeLabelDefaultsSchema = strictObject({
  ...NodeLabelDefaultSchema.shape,
  font: TableCellNullableFontSchema.optional(),
}).refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table Cell Node label defaults'));

const TableCellPathLabelDefaultsSchema = PathLabelDefaultSchema.extend({
  font: TableCellNullableFontSchema.optional(),
}).refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table Cell Path label defaults'));

const TableCellNodeDefaultsSchema = NodeDefaultSchema.extend({
  style: NodeDefaultSchema.shape.style.unwrap().extend({ font: TableCellNullableFontSchema.optional() }).optional(),
  label: TableCellNodeLabelDefaultsSchema.optional(),
}).refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table Cell Node defaults'));

const TableCellPathDefaultsSchema = PathDefaultSchema.extend({
  label: TableCellPathLabelDefaultsSchema.optional(),
}).refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table Cell Path defaults'));

const TableCellScopeDefaultsSchema = strictObject({
  style: TableCellContentStyleDefaultsStyleSchema.nullable().optional(),
  node: TableCellNodeDefaultsSchema.nullable().optional(),
  path: TableCellPathDefaultsSchema.nullable().optional(),
  reset: ScopeSchema.shape.defaults.unwrap().shape.reset.nullable().optional(),
})
  .refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table Cell Scope defaults'))
  .describe('Sparse Core Scope descendant defaults for Table Cell content.');

const TableCellContentStyleDefaultsSchema = strictObject({
  defaults: TableCellScopeDefaultsSchema.nullable().optional(),
})
  .refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table Cell content defaults'))
  .describe('Sparse Core Scope defaults applied to Table Cell content.');

/** 校验单元格内容布局前应用的 Core Scope 默认样式 */
export const TableCellContentStyleSchema = ScopeSchema.pick({ defaults: true }).describe(
  'Core Scope style defaults applied to Table Cell content before layout.',
);

/** 校验单元格呈现与布局共享的背景、内容和边框外观 */
export const TableCellAppearanceSchema = strictObject({
  background: TableCellBackgroundSchema.optional().describe('Optional paint for the resolved Table Cell box.'),
  content: TableCellContentStyleSchema.optional().describe('Optional Core Scope defaults for Cell content.'),
  borders: TableCellBordersSchema.optional().describe('Optional final per-side Border Graph candidates.'),
}).describe('Resolved visual appearance shared by Table Cell presentation and layout.');

/** 校验既有单元格的稀疏外观默认值 */
export const TableCellAppearanceDefaultsSchema = strictObject({
  background: TableCellBackgroundDefaultsSchema.nullable().optional().describe('Sparse background defaults.'),
  content: TableCellContentStyleDefaultsSchema.nullable()
    .optional()
    .describe('Sparse Core Scope defaults for Cell content.'),
  borders: TableCellBordersDefaultsSchema.nullable().optional().describe('Sparse physical-side border defaults.'),
})
  .refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table Cell appearance defaults'))
  .describe('Sparse appearance defaults for an existing Table Cell.');

/** 校验分别作用于表体和列标题单元格的默认外观 */
export const TableAppearanceDefaultsSchema = strictObject({
  body: TableCellAppearanceDefaultsSchema.nullable().optional().describe('Sparse defaults for existing body Cells.'),
  columnHeader: TableCellAppearanceDefaultsSchema.nullable()
    .optional()
    .describe('Sparse defaults for existing column-header Cells.'),
})
  .refine(value => Object.keys(value).length > 0, requireAtLeastOneField('Table appearance defaults'))
  .describe('Sparse Table Cell appearance defaults grouped by existing Cell location.');
