import { CompositeBaseSchema, NodeSchema, ScopePropsSchema } from '@retikz/core';
import { JsonValueSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { array, boolean, enum as zodEnum, literal, never, string, union } from 'zod';

import { SurfaceSchema } from '../../../presentation/surface/schema';
import { DataExpandSchema } from '../../_cell/data';
import {
  CellSchema,
  CellStyleSchema,
  CellLayoutSchema,
  OpenBorderSchema,
  CollectionArrowSchema,
} from '../../_cell/schema';
import { ArraySkeletonSchema } from '../../array';

/** 单格尺寸与栈底到栈顶的堆叠方向 */
export const StackLayoutSchema = CellLayoutSchema.extend({
  direction: zodEnum(['up', 'down', 'left', 'right']).default('up').describe('Direction from bottom to top.'),
  reverseArrows: boolean().default(false).describe('Swap operation arrow sides without changing flow or cell order.'),
  gap: NonNegativeNumberSchema.default(8).describe('Distance between adjacent cells.'),
});

/** 开放边框复用 Core Path 外观，不开放结构与身份字段 */
export const StackBorderSchema = OpenBorderSchema;

/** 栈的空格或符号格骨架，与一维集合共用输入契约 */
export const StackSkeletonSchema = ArraySkeletonSchema;

const StackBaseSchema = CompositeBaseSchema.extend({
  namespace: literal('standard').describe('Standard collection namespace.'),
  type: literal('stack').describe('Static stack discriminator.'),
  ...ScopePropsSchema.omit({ style: true }).shape,
  style: CellStyleSchema.optional(),
  layout: StackLayoutSchema.optional().describe('Cell sizing, direction and spacing.'),
  label: NodeSchema.shape.label,
  arrow: CollectionArrowSchema,
  border: union([boolean(), StackBorderSchema])
    .default(true)
    .describe('Open three-sided border; false hides the border without changing padding.'),
  padding: SurfaceSchema.shape.padding
    .unwrap()
    .default(8)
    .describe('Space around the cell envelope, independent of cell padding and border visibility.'),
});

/** 有序单元、JSON 数据与骨架互斥的静态栈 Source */
export const StackSchema = union([
  StackBaseSchema.extend({
    items: array(union([string(), CellSchema])).describe('Cells ordered from bottom to top.'),
    data: never().optional(),
    skeleton: never().optional(),
    dataExpand: never().optional(),
  }),
  StackBaseSchema.extend({
    data: array(JsonValueSchema).readonly().describe('JSON values ordered from bottom to top.'),
    items: never().optional(),
    skeleton: never().optional(),
    dataExpand: DataExpandSchema,
  }),
  StackBaseSchema.extend({
    skeleton: StackSkeletonSchema,
    items: never().optional(),
    data: never().optional(),
    dataExpand: never().optional(),
  }),
])
  .superRefine((node, context) => {
    const ids = new Set<string>();
    node.items?.forEach((cell, index) => {
      if (typeof cell === 'string' || cell.id === undefined) return;
      if (ids.has(cell.id))
        context.addIssue({ code: 'custom', path: ['items', index, 'id'], message: `Duplicate cell id '${cell.id}'.` });
      ids.add(cell.id);
    });
  })
  .describe('Static stack presentation with the last input cell at the open end.');
