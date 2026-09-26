import { CompositeBaseSchema, NodeSchema, ScopePropsSchema } from '@retikz/core';
import { JsonObjectSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { array, literal, never, strictObject, string, union } from 'zod';

import { DataObjectDisplaySchema } from '../../shared/cell/data';
import { CellSchema, CellStyleSchema, CellLayoutSchema } from '../../shared/cell/schema';

export const MapGapSchema = strictObject({ row: NonNegativeNumberSchema, column: NonNegativeNumberSchema }).describe(
  'Separate row and column gaps.',
);
/** Map 共用单元格样式及键值角色覆盖 */
export const MapStyleSchema = CellStyleSchema.extend({
  key: CellStyleSchema.optional().describe('Key cell visual overrides over shared style fields.'),
  value: CellStyleSchema.optional().describe('Value cell visual overrides over shared style fields.'),
}).describe('Shared cell visual defaults with key and value overrides.');

/** Map 共用单元格布局、间距及键值角色覆盖 */
export const MapLayoutSchema = CellLayoutSchema.extend({
  gap: union([NonNegativeNumberSchema, MapGapSchema]).default(2),
  key: CellLayoutSchema.optional().describe('Key cell layout overrides over shared layout fields.'),
  value: CellLayoutSchema.optional().describe('Value cell layout overrides over shared layout fields.'),
}).describe('Map two-column allocation and spacing.');
export const MapEntrySchema = strictObject({
  key: union([string(), CellSchema]),
  value: union([string(), CellSchema]),
}).describe('One key/value display pair; displayed keys may repeat.');
const MapBaseSchema = CompositeBaseSchema.extend({
  namespace: literal('standard'),
  type: literal('map'),
  ...ScopePropsSchema.omit({ style: true }).shape,
  entries: array(MapEntrySchema).optional().describe('Ordered key/value pairs, not a JavaScript Map.'),
  data: JsonObjectSchema.optional().describe(
    'JSON object rendered recursively in own enumerable key order; mutually exclusive with entries.',
  ),
  style: MapStyleSchema.optional(),
  label: NodeSchema.shape.label,
  layout: MapLayoutSchema.optional(),
});

export const MapSchema = union([
  MapBaseSchema.required({ entries: true })
    .extend({ data: never().optional(), dataObjectDisplay: never().optional() })
    .superRefine((node, context) => {
      const seen = new Set<string>();
      node.entries.forEach((entry, index) => {
        for (const role of ['key', 'value'] as const) {
          const cell = entry[role];
          const id = typeof cell === 'string' ? undefined : cell.id;
          if (id === undefined) continue;
          if (seen.has(id))
            context.addIssue({
              code: 'custom',
              path: ['entries', index, role, 'id'],
              message: `Duplicate cell id '${id}'.`,
            });
          seen.add(id);
        }
      });
    }),
  MapBaseSchema.required({ data: true }).extend({
    entries: never().optional(),
    dataObjectDisplay: DataObjectDisplaySchema,
  }),
]).describe('Two-column ordered key/value presentation.');
