import { CompositeBaseSchema, NodeSchema, ScopePropsSchema } from '@retikz/core';
import {
  JsonValueSchema,
  NonBlankStringSchema,
  NonNegativeNumberSchema,
  NonNegativeIntegerSchema,
} from '@retikz/foundation';
import { array, boolean, enum as zodEnum, literal, never, string, union } from 'zod';

import { CellSchema, CellStyleSchema, CellLayoutSchema } from '../../shared/cell/schema';
import { ListCellIdMode, ListDirection } from '../constants';

export const ListLayoutSchema = CellLayoutSchema.extend({
  direction: zodEnum(ListDirection).default(ListDirection.Row).describe('Single-axis cell order without wrapping.'),
  gap: NonNegativeNumberSchema.default(2).describe('Distance between adjacent cells and the index strip.'),
}).describe('List cell allocation and ordering.');

const ListBaseSchema = CompositeBaseSchema.extend({
  namespace: literal('standard'),
  type: literal('list'),
  ...ScopePropsSchema.omit({ style: true }).shape,
  items: array(union([string(), CellSchema]))
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
  showIndex: boolean().default(false).describe('Show an index strip above rows or to the left of columns.'),
  indexStart: NonNegativeIntegerSchema.default(0).describe('First displayed index; not cell identity.'),
});

export const ListSchema = union([
  ListBaseSchema.required({ items: true })
    .extend({ data: never().optional() })
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
    .extend({ items: never().optional() })
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
