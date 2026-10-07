import { CompositeBaseSchema, NodeSchema, ScopePropsSchema } from '@retikz/core';
import { JsonValueSchema, NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { array, boolean, enum as zodEnum, literal, never, string, union } from 'zod';

import { DataExpandSchema } from '../../_cell/data';
import { CellSchema, CellStyleSchema, CellLayoutSchema, LinearCellSkeletonSchema } from '../../_cell/schema';
import { CollectionIndexOptionsSchema, CollectionIndexStyleSchema } from '../../_index';
import { ArrayCellIdMode, ArrayDirection } from '../constants';

/** 复用集合格外索引的文本样式约束 */
export const ArrayIndexStyleSchema = CollectionIndexStyleSchema;

/** 复用集合格外索引的编号、标签与位置约束 */
export const ArrayIndexOptionsSchema = CollectionIndexOptionsSchema;

/** 校验无真实数据的数组骨架：指定空格数量或按顺序提供格内标签 */
export const ArraySkeletonSchema = LinearCellSkeletonSchema;

/** Array 的逐格内容宽度模式，不改变 Map 共享单元格契约 */
export const ArrayCellLayoutSchema = CellLayoutSchema.extend({
  width: union([CellLayoutSchema.shape.width.unwrap(), literal('content')])
    .optional()
    .describe('Fixed border-box width, shared maximum auto width, or this cell content width plus padding.'),
});

/** Array 单格允许独立内容宽度 */
export const ArrayCellSchema = CellSchema.extend({
  layout: ArrayCellLayoutSchema.optional().describe('Sparse cell dimensions, padding and overflow overrides.'),
  style: CellStyleSchema.optional().describe('Sparse visual overrides for a Array or Map cell.'),
});

/** 校验不换行的单轴格子布局，并补齐排列方向与相邻间距 */
export const ArrayLayoutSchema = ArrayCellLayoutSchema.extend({
  direction: zodEnum(ArrayDirection).default(ArrayDirection.Row).describe('Single-axis cell order without wrapping.'),
  gap: NonNegativeNumberSchema.default(2).describe('Distance between adjacent cells and the index strip.'),
}).describe('Array cell allocation and ordering.');

const ArrayBaseSchema = CompositeBaseSchema.extend({
  namespace: literal('standard').describe('Composite namespace for Standard drawing capabilities.'),
  type: literal('array').describe('Composite type for the array presentation.'),
  ...ScopePropsSchema.omit({ style: true }).shape,
  skeleton: ArraySkeletonSchema.optional().describe(
    'Schematic structure without real data; excludes other content inputs.',
  ),
  items: array(union([string(), ArrayCellSchema]))
    .optional()
    .describe('Cells in display order; a string supplies content and optionally an id. An empty array is valid.'),
  cellIdMode: zodEnum(ArrayCellIdMode)
    .default(ArrayCellIdMode.Explicit)
    .describe(
      'Cell identity: explicit ids only, items strings as ids, or direct zero-based ids derived from the Array id.',
    ),
  data: array(JsonValueSchema)
    .readonly()
    .optional()
    .describe('JSON array rendered recursively without inferred cell ids; mutually exclusive with items.'),
  style: CellStyleSchema.optional(),
  label: NodeSchema.shape.label,
  layout: ArrayLayoutSchema.optional(),
  index: union([boolean(), ArrayIndexOptionsSchema])
    .default(false)
    .describe('False hides indices; true or an object enables the index strip.'),
});

/** 校验数组集合的显式格子、JSON 数据或骨架输入，并拒绝混用互斥来源 */
export const ArraySchema = union([
  ArrayBaseSchema.required({ items: true })
    .extend({
      skeleton: never().optional().describe('Not accepted in this input branch.'),
      data: never().optional().describe('Not accepted in this input branch.'),
      dataExpand: never().optional().describe('Not accepted in this input branch.'),
    })
    .superRefine((node, context) => {
      if (node.cellIdMode === ArrayCellIdMode.Index && node.id === undefined) {
        context.addIssue({ code: 'custom', path: ['id'], message: 'Index cell identity requires a Array id.' });
        return;
      }

      const seen = new Set<string>();
      node.items.forEach((cell, index) => {
        if (
          typeof cell === 'string' &&
          node.cellIdMode === ArrayCellIdMode.String &&
          !NonBlankStringSchema.safeParse(cell).success
        ) {
          context.addIssue({
            code: 'custom',
            path: ['items', index],
            message: 'String used as cell id must contain a non-whitespace character.',
          });
          return;
        }

        const explicitId =
          typeof cell === 'string' ? (node.cellIdMode === ArrayCellIdMode.String ? cell : undefined) : cell.id;
        const ids = new Set<string>();
        if (node.cellIdMode === ArrayCellIdMode.Index) ids.add(`${node.id}-${index}`);
        if (explicitId !== undefined) ids.add(explicitId);

        for (const id of ids) {
          if (seen.has(id))
            context.addIssue({
              code: 'custom',
              path: typeof cell === 'string' ? ['items', index] : ['items', index, 'id'],
              message: `Duplicate cell id '${id}'.`,
            });

          seen.add(id);
        }
      });
    }),
  ArrayBaseSchema.required({ data: true })
    .extend({
      skeleton: never().optional().describe('Not accepted in this input branch.'),
      items: never().optional().describe('Not accepted in this input branch.'),
      dataExpand: DataExpandSchema,
    })
    .superRefine((node, context) => {
      if (node.cellIdMode === ArrayCellIdMode.String)
        context.addIssue({
          code: 'custom',
          path: ['cellIdMode'],
          message: 'String cell identity only supports items.',
        });

      if (node.cellIdMode === ArrayCellIdMode.Index && node.id === undefined)
        context.addIssue({ code: 'custom', path: ['id'], message: 'Index cell identity requires a Array id.' });
    }),
  ArrayBaseSchema.required({ skeleton: true })
    .extend({
      items: never().optional().describe('Not accepted in this input branch.'),
      data: never().optional().describe('Not accepted in this input branch.'),
      dataExpand: never().optional().describe('Not accepted in this input branch.'),
    })
    .superRefine((node, context) => {
      if (node.cellIdMode === ArrayCellIdMode.String)
        context.addIssue({
          code: 'custom',
          path: ['cellIdMode'],
          message: 'String cell identity only supports items.',
        });

      if (node.cellIdMode === ArrayCellIdMode.Index && node.id === undefined)
        context.addIssue({ code: 'custom', path: ['id'], message: 'Index cell identity requires a Array id.' });
    }),
])
  .superRefine((node, context) => {
    const count = node.items?.length ?? node.data?.length ?? node.skeleton?.count ?? node.skeleton?.labels?.length;
    if (typeof node.index === 'object' && node.index.labels !== undefined && node.index.labels.length !== count)
      context.addIssue({
        code: 'custom',
        path: ['index', 'labels'],
        message: 'Index labels must match the direct cell count.',
      });
  })
  .describe('One-dimensional presentation from items, JSON data, or a schematic skeleton.');
