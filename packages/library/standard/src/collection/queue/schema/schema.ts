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

/** 单格尺寸与队首到队尾的排列方向 */
export const QueueLayoutSchema = CellLayoutSchema.extend({
  direction: zodEnum(['up', 'down', 'left', 'right']).default('right').describe('Direction from front to back.'),
  gap: NonNegativeNumberSchema.default(8).describe('Distance between adjacent cells.'),
});

/** 开放边框复用 Core Path 外观，不开放结构与身份字段 */
export const QueueBorderSchema = OpenBorderSchema;

/** 队列的空格或符号格骨架，与一维集合共用输入契约 */
export const QueueSkeletonSchema = ArraySkeletonSchema;

const QueueBaseSchema = CompositeBaseSchema.extend({
  namespace: literal('standard').describe('Standard collection namespace.'),
  type: literal('queue').describe('Static queue discriminator.'),
  ...ScopePropsSchema.omit({ style: true }).shape,
  style: CellStyleSchema.optional(),
  layout: QueueLayoutSchema.optional().describe('Cell sizing, direction and spacing.'),
  label: NodeSchema.shape.label,
  arrow: CollectionArrowSchema,
  border: union([boolean(), QueueBorderSchema])
    .default(true)
    .describe('Two separate side borders with both ends open; false hides the border without changing padding.'),
  padding: SurfaceSchema.shape.padding
    .unwrap()
    .default(8)
    .describe('Space around the cell envelope, independent of cell padding and border visibility.'),
});

/** 有序单元、JSON 数据与骨架互斥的静态队列 Source */
export const QueueSchema = union([
  QueueBaseSchema.extend({
    items: array(union([string(), CellSchema])).describe('Cells ordered from front to back.'),
    data: never().optional(),
    skeleton: never().optional(),
    dataExpand: never().optional(),
  }),
  QueueBaseSchema.extend({
    data: array(JsonValueSchema).readonly().describe('JSON values ordered from front to back.'),
    items: never().optional(),
    skeleton: never().optional(),
    dataExpand: DataExpandSchema,
  }),
  QueueBaseSchema.extend({
    skeleton: QueueSkeletonSchema,
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
  .describe('Static queue presentation ordered from front to back.');
