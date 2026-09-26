import { CompositeBaseSchema, NodeSchema, NodeStyleSchema, ScopePropsSchema } from '@retikz/core';
import {
  JsonValueSchema,
  NonBlankStringSchema,
  NonNegativeNumberSchema,
  NonNegativeIntegerSchema,
} from '@retikz/foundation';
import { array, boolean, enum as zodEnum, literal, never, strictObject, string, union } from 'zod';

import { DataObjectDisplaySchema } from '../../shared/cell/data';
import { CellSchema, CellStyleSchema, CellLayoutSchema } from '../../shared/cell/schema';
import { ListCellIdMode, ListDirection, ListIndexPosition } from '../constants';

/** 索引文本外观，复用 Node 样式字段，不继承单格覆盖 */
export const ListIndexStyleSchema = NodeStyleSchema.pick({
  font: true,
  textColor: true,
  color: true,
  opacity: true,
}).describe('Index text appearance; cell-level styles do not affect indices.');

/** 索引条的位置、起点和文本样式 */
export const ListIndexOptionsSchema = strictObject({
  position: zodEnum(ListIndexPosition)
    .default(ListIndexPosition.Before)
    .describe('Before means above a row or left of a column; after means below or right.'),
  start: NonNegativeIntegerSchema.default(0).describe('First displayed index; not cell identity.'),
  style: ListIndexStyleSchema.optional(),
}).describe('Index strip placement, numbering, and text appearance.');

/** List 的逐格内容宽度模式，不改变 Map 共享单元格契约 */
export const ListCellLayoutSchema = CellLayoutSchema.extend({
  width: union([CellLayoutSchema.shape.width.unwrap(), literal('content')])
    .optional()
    .describe('Fixed border-box width, shared maximum auto width, or this cell content width plus padding.'),
});

/** List 单格允许独立内容宽度 */
export const ListCellSchema = CellSchema.extend({ layout: ListCellLayoutSchema.optional() });

export const ListLayoutSchema = ListCellLayoutSchema.extend({
  direction: zodEnum(ListDirection).default(ListDirection.Row).describe('Single-axis cell order without wrapping.'),
  gap: NonNegativeNumberSchema.default(2).describe('Distance between adjacent cells and the index strip.'),
}).describe('List cell allocation and ordering.');

const ListBaseSchema = CompositeBaseSchema.extend({
  namespace: literal('standard'),
  type: literal('list'),
  ...ScopePropsSchema.omit({ style: true }).shape,
  items: array(union([string(), ListCellSchema]))
    .optional()
    .describe('Cells in display order; a string supplies content and optionally an id. An empty array is valid.'),
  cellIdMode: zodEnum(ListCellIdMode)
    .default(ListCellIdMode.Explicit)
    .describe(
      'Cell identity: explicit ids only, items strings as ids, or direct zero-based ids derived from the List id.',
    ),
  data: array(JsonValueSchema)
    .readonly()
    .optional()
    .describe('JSON array rendered recursively without inferred cell ids; mutually exclusive with items.'),
  style: CellStyleSchema.optional(),
  label: NodeSchema.shape.label,
  layout: ListLayoutSchema.optional(),
  index: union([boolean(), ListIndexOptionsSchema])
    .default(false)
    .describe('False hides indices; true or an object enables the index strip.'),
});

export const ListSchema = union([
  ListBaseSchema.required({ items: true })
    .extend({ data: never().optional(), dataObjectDisplay: never().optional() })
    .superRefine((node, context) => {
      if (node.cellIdMode === ListCellIdMode.Index && node.id === undefined) {
        context.addIssue({ code: 'custom', path: ['id'], message: 'Index cell identity requires a List id.' });
        return;
      }
      const seen = new Set<string>();
      node.items.forEach((cell, index) => {
        if (
          typeof cell === 'string' &&
          node.cellIdMode === ListCellIdMode.String &&
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
          typeof cell === 'string' ? (node.cellIdMode === ListCellIdMode.String ? cell : undefined) : cell.id;
        const ids = new Set<string>();
        if (node.cellIdMode === ListCellIdMode.Index) ids.add(`${node.id}-${index}`);
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
  ListBaseSchema.required({ data: true })
    .extend({ items: never().optional(), dataObjectDisplay: DataObjectDisplaySchema })
    .superRefine((node, context) => {
      if (node.cellIdMode === ListCellIdMode.String)
        context.addIssue({
          code: 'custom',
          path: ['cellIdMode'],
          message: 'String cell identity only supports items.',
        });
      if (node.cellIdMode === ListCellIdMode.Index && node.id === undefined)
        context.addIssue({ code: 'custom', path: ['id'], message: 'Index cell identity requires a List id.' });
    }),
]).describe('One-dimensional array presentation with shared and per-cell dimensions.');
