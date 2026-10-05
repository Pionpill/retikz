import { CompositeBaseSchema, NodeSchema, ScopePropsSchema } from '@retikz/core';
import { JsonObjectSchema } from '@retikz/foundation';
import { LayoutRowColumnGapSchema } from '@retikz/layout';
import { array, literal, never, strictObject, string, union } from 'zod';

import { DataExpandSchema } from '../../_cell/data';
import { CellSchema, CellStyleSchema, CellLayoutSchema } from '../../_cell/schema';

/** Map 共用单元格样式及键值角色覆盖 */
export const MapStyleSchema = CellStyleSchema.extend({
  key: CellStyleSchema.optional().describe('Key cell visual overrides over shared style fields.'),
  value: CellStyleSchema.optional().describe('Value cell visual overrides over shared style fields.'),
}).describe('Shared cell visual defaults with key and value overrides.');

/** Map 共用单元格布局、间距及键值角色覆盖 */
export const MapLayoutSchema = CellLayoutSchema.extend({
  gap: LayoutRowColumnGapSchema.default(2).describe('Uniform or separate row and column gaps between cells.'),
  key: CellLayoutSchema.optional().describe('Key cell layout overrides over shared layout fields.'),
  value: CellLayoutSchema.optional().describe('Value cell layout overrides over shared layout fields.'),
}).describe('Map two-column allocation and spacing.');

export const MapEntrySchema = strictObject({
  key: union([string(), CellSchema]).describe('Text or drawable content for the key cell.'),
  value: union([string(), CellSchema]).describe('Text or drawable content for the value cell.'),
}).describe('One key/value display pair; displayed keys may repeat.');

export const MapSkeletonSchema = strictObject({
  keys: array(string()).describe(
    'Ordered plain-text keys; repeated and empty keys are allowed. Values have no content.',
  ),
}).describe('Schematic key/value rows without real data.');

const MapBaseSchema = CompositeBaseSchema.extend({
  namespace: literal('standard').describe('Composite namespace for Standard drawing capabilities.'),
  type: literal('map').describe('Composite type for the map presentation.'),
  ...ScopePropsSchema.omit({ style: true }).shape,
  skeleton: MapSkeletonSchema.optional().describe(
    'Schematic structure without real data; excludes other content inputs.',
  ),
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
    .extend({
      skeleton: never().optional().describe('Not accepted in this input branch.'),
      data: never().optional().describe('Not accepted in this input branch.'),
      dataExpand: never().optional().describe('Not accepted in this input branch.'),
    })
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
    skeleton: never().optional().describe('Not accepted in this input branch.'),
    entries: never().optional().describe('Not accepted in this input branch.'),
    dataExpand: DataExpandSchema,
  }),
  MapBaseSchema.required({ skeleton: true }).extend({
    entries: never().optional().describe('Not accepted in this input branch.'),
    data: never().optional().describe('Not accepted in this input branch.'),
    dataExpand: never().optional().describe('Not accepted in this input branch.'),
  }),
]).describe('Two-column ordered key/value presentation from entries, JSON data, or a schematic skeleton.');
