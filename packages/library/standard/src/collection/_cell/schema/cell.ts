import {
  ChildSchema,
  GraphicColorSchema,
  GraphicElementOpacitySchema,
  GraphicFillSchema,
  GraphicStrokeSchema,
  PathStrokeSchema,
  TextVisualSchema,
  ScopePropsSchema,
} from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { literal, strictObject, string, union } from 'zod';

import { SurfaceSchema } from '../../../presentation/surface/schema';

/** 校验单格的稀疏视觉配置，未提供的字段留待集合样式继承 */
export const CellStyleSchema = strictObject({
  ...GraphicColorSchema.shape,
  ...GraphicElementOpacitySchema.shape,
  ...GraphicStrokeSchema.shape,
  ...PathStrokeSchema.shape,
  ...GraphicFillSchema.shape,
  ...TextVisualSchema.shape,
  cornerRadius: SurfaceSchema.shape.cornerRadius.unwrap().optional(),
}).describe('Sparse visual overrides for a collection cell.');

/** 校验单格的尺寸、内边距与溢出配置，允许由集合补全缺省字段 */
export const CellLayoutSchema = strictObject({
  width: union([NonNegativeNumberSchema, literal('auto')])
    .optional()
    .describe('Fixed cell border-box width; auto uses the structure natural sizing.'),
  height: union([NonNegativeNumberSchema, literal('auto')])
    .optional()
    .describe('Fixed cell border-box height; auto uses the structure natural sizing.'),
  padding: SurfaceSchema.shape.padding.unwrap().optional(),
  overflow: SurfaceSchema.shape.overflow.unwrap().optional(),
}).describe('Sparse cell dimensions, padding and overflow overrides.');

/** 校验可选文本或单个绘图子项构成的格子；省略内容时保留空格 */
export const CellSchema = strictObject({
  id: ScopePropsSchema.shape.id,
  content: union([string(), ChildSchema])
    .optional()
    .describe('Optional text or one drawable child; omitted content leaves an empty cell.'),
  style: CellStyleSchema.optional(),
  layout: CellLayoutSchema.optional(),
}).describe('A drawable cell with optional allocation identity.');

/** 在样式继承完成后补齐单格的基础填充、描边与圆角默认值 */
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

/** 在布局继承完成后补齐单格的内边距与溢出默认值 */
export const CellLayoutDefaultsSchema = CellLayoutSchema.extend({
  padding: CellLayoutSchema.shape.padding.default(8),
  overflow: CellLayoutSchema.shape.overflow.default('visible'),
}).describe('Base cell layout defaults applied after inheritance.');

/** 嵌套集合的外层单格默认不再叠加背景 */
export const NestedCollectionCellDefaultsSchema = CellDefaultsSchema.extend({
  fill: CellStyleSchema.shape.fill.default('none'),
});

/** 嵌套集合自行组织内部留白，外层单格默认不增加内边距 */
export const NestedCollectionCellLayoutDefaultsSchema = CellLayoutDefaultsSchema.extend({
  padding: CellLayoutSchema.shape.padding.default(0),
});
