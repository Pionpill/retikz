import { CompositeBaseSchema, ScopePropsSchema } from '@retikz/core';
import { NonBlankStringSchema, NonNegativeNumberSchema, NonNegativeIntegerSchema } from '@retikz/foundation';
import { array, boolean, enum as zodEnum, literal, union } from 'zod';

import { CellSchema, CellStyleSchema, CellLayoutSchema } from '../../shared/schemas';
import { ListDirection } from '../constants';

export const ListLayoutSchema = CellLayoutSchema.extend({
  direction: zodEnum(ListDirection).default(ListDirection.Row).describe('Single-axis cell order without wrapping.'),
  gap: NonNegativeNumberSchema.default(2).describe('Distance between adjacent cells and the index strip.'),
}).describe('List cell allocation and ordering.');

export const ListSchema = CompositeBaseSchema.extend({
  namespace: literal('standard'),
  type: literal('list'),
  ...ScopePropsSchema.omit({ style: true }).shape,
  items: array(union([NonBlankStringSchema, CellSchema])).describe(
    'Cells in display order; a string supplies both content and id. An empty array is valid.',
  ),
  style: CellStyleSchema.optional(),
  layout: ListLayoutSchema.optional(),
  showIndex: boolean().default(false).describe('Show an index strip above rows or to the left of columns.'),
  indexStart: NonNegativeIntegerSchema.default(0).describe('First displayed index; not cell identity.'),
})
  .superRefine((node, context) => {
    const seen = new Set<string>();
    node.items.forEach((cell, index) => {
      const id = typeof cell === 'string' ? cell : cell.id;
      if (id === undefined) return;
      if (seen.has(id))
        context.addIssue({
          code: 'custom',
          path: typeof cell === 'string' ? ['items', index] : ['items', index, 'id'],
          message: `Duplicate cell id '${id}'.`,
        });
      seen.add(id);
    });
  })
  .describe('One-dimensional array presentation with shared and per-cell dimensions.');
