import {
  CompositeBaseSchema,
  NodeSchema,
  GraphicColorSchema,
  GraphicElementOpacitySchema,
  TextVisualSchema,
  ScopePropsSchema,
} from '@retikz/core';
import {
  JsonValueSchema,
  NonBlankStringSchema,
  NonNegativeNumberSchema,
  NonNegativeIntegerSchema,
} from '@retikz/foundation';
import { array, boolean, enum as zodEnum, literal, never, strictObject, string, union } from 'zod';

import { DataExpandSchema } from '../../_cell/data';
import { CellSchema, CellStyleSchema, CellLayoutSchema } from '../../_cell/schema';
import { ArrayCellIdMode, ArrayDirection, ArrayIndexPosition } from '../constants';

/** 索引文本外观，复用 Node 样式字段，不继承单格覆盖 */
export const ArrayIndexStyleSchema = strictObject({
  ...TextVisualSchema.shape,
  ...GraphicColorSchema.shape,
  ...GraphicElementOpacitySchema.shape,
}).describe('Index text appearance; cell-level styles do not affect indices.');

const ArrayIndexBaseSchema = strictObject({
  position: zodEnum(ArrayIndexPosition)
    .default(ArrayIndexPosition.Before)
    .describe('Before means above a row or left of a column; after means below or right.'),
  style: ArrayIndexStyleSchema.optional().describe('Index text appearance; cell-level styles do not affect indices.'),
});

export const ArrayIndexOptionsSchema = union([
  ArrayIndexBaseSchema.extend({
    start: NonNegativeIntegerSchema.default(0).describe('First displayed index; not cell identity.'),
    labels: never().optional().describe('Not accepted in this input branch.'),
  }),
  ArrayIndexBaseSchema.extend({
    labels: array(string()).describe(
      'Outside labels in cell order; empty text hides a label. Length must match cells.',
    ),
    start: never().optional().describe('Not accepted in this input branch.'),
  }),
]).describe('Index strip placement and either automatic numbering or explicit labels.');

export const ArraySkeletonSchema = union([
  strictObject({
    count: NonNegativeIntegerSchema.describe('Number of contentless cells.'),
    labels: never().optional().describe('Not accepted in this input branch.'),
  }),
  strictObject({
    labels: array(string()).describe(
      'Inside-cell plain text in order; empty text means absent content. Length determines cell count.',
    ),
    count: never().optional().describe('Not accepted in this input branch.'),
  }),
]).describe('Schematic cells from either a count or symbolic labels, without real data.');

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
