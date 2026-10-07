import { CompositeBaseSchema, NodeSchema, ScopePropsSchema } from '@retikz/core';
import { JsonValueSchema, NonNegativeIntegerSchema } from '@retikz/foundation';
import { LayoutRowColumnGapSchema } from '@retikz/layout';
import { array, boolean, enum as zodEnum, literal, never, strictObject, string, union } from 'zod';

import { DataExpandSchema } from '../../_cell/data';
import { CellLayoutSchema, CellSchema, CellStyleSchema } from '../../_cell/schema';
import { CollectionIndexOptionsSchema } from '../../_index';

/** Matrix 单轴的自动或自定义索引 */
export const MatrixAxisIndexSchema = CollectionIndexOptionsSchema;

/** 分别控制行列索引，空对象不启用任一轴 */
export const MatrixIndexSchema = union([
  boolean(),
  strictObject({
    row: union([boolean(), MatrixAxisIndexSchema])
      .optional()
      .describe('Row labels on the left or right; omitted hides this axis.'),
    column: union([boolean(), MatrixAxisIndexSchema])
      .optional()
      .describe('Column labels above or below; omitted hides this axis.'),
  }),
])
  .default(false)
  .describe('False hides both axes; true enables both; objects configure axes independently.');

/** Matrix 的普通单格布局与行列间距 */
export const MatrixLayoutSchema = CellLayoutSchema.extend({
  gap: LayoutRowColumnGapSchema.default(2).describe('Uniform or separate gaps between rows and columns.'),
});

/** 空矩形或二维格内符号；两种配置互斥 */
export const MatrixSkeletonSchema = union([
  strictObject({
    rows: NonNegativeIntegerSchema.describe('Number of rows, including zero.'),
    columns: NonNegativeIntegerSchema.describe('Number of columns, including zero.'),
    labels: never().optional().describe('Not accepted with explicit dimensions.'),
  }).superRefine((value, context) => {
    if (!Number.isSafeInteger(value.rows * value.columns))
      context.addIssue({ code: 'custom', path: ['columns'], message: 'The cell count must be a safe integer.' });
  }),
  strictObject({
    labels: array(array(string())).describe('Rectangular inside-cell text; empty strings have no content.'),
    rows: never().optional().describe('Derived from labels.'),
    columns: never().optional().describe('Derived from labels.'),
  }),
]);

const MatrixBaseSchema = CompositeBaseSchema.extend({
  namespace: literal('standard').describe('Standard composite namespace.'),
  type: literal('matrix').describe('Rectangular cell presentation.'),
  ...ScopePropsSchema.omit({ style: true }).shape,
  style: CellStyleSchema.optional(),
  layout: MatrixLayoutSchema.optional().describe('Cell dimensions, padding, overflow, and row or column gaps.'),
  label: NodeSchema.shape.label,
  index: MatrixIndexSchema,
  cellIdMode: zodEnum(['explicit', 'index'])
    .default('explicit')
    .describe('Explicit cell ids or zero-based row/column ids derived from the Matrix id.'),
});

/** 三种互斥的矩形输入，结构校验只在 Source 边界执行 */
export const MatrixSchema = union([
  MatrixBaseSchema.extend({
    items: array(array(union([string(), CellSchema]))).describe('Rectangular rows of explicit cells.'),
    data: never().optional().describe('Not accepted with items.'),
    skeleton: never().optional().describe('Not accepted with items.'),
    dataExpand: never().optional().describe('Only accepted with data.'),
  }),
  MatrixBaseSchema.extend({
    data: array(array(JsonValueSchema).readonly())
      .readonly()
      .describe('Rectangular JSON rows; values inside each cell remain data.'),
    items: never().optional().describe('Not accepted with data.'),
    skeleton: never().optional().describe('Not accepted with data.'),
    dataExpand: DataExpandSchema,
  }),
  MatrixBaseSchema.extend({
    skeleton: MatrixSkeletonSchema.describe('Schematic rectangle without real data.'),
    items: never().optional().describe('Not accepted with skeleton.'),
    data: never().optional().describe('Not accepted with skeleton.'),
    dataExpand: never().optional().describe('Only accepted with data.'),
  }),
])
  .superRefine((node, context) => {
    const rows = node.items ?? node.data ?? node.skeleton.labels;
    const rowCount = rows?.length ?? node.skeleton?.rows ?? 0;
    const columnCount = rows === undefined ? (node.skeleton?.columns ?? 0) : (rows[0]?.length ?? 0);
    const field = node.items !== undefined ? ['items'] : node.data !== undefined ? ['data'] : ['skeleton', 'labels'];
    rows?.forEach((row, index) => {
      if (row.length !== columnCount)
        context.addIssue({
          code: 'custom',
          path: [...field, index],
          message: 'Every row must have the same number of columns.',
        });
    });
    if (typeof node.index === 'object')
      for (const axis of ['row', 'column'] as const) {
        const index = node.index[axis];
        if (
          typeof index === 'object' &&
          index.labels !== undefined &&
          index.labels.length !== (axis === 'row' ? rowCount : columnCount)
        )
          context.addIssue({
            code: 'custom',
            path: ['index', axis, 'labels'],
            message: 'Index labels must match the axis length.',
          });
      }

    if (node.cellIdMode === 'index' && node.id === undefined)
      context.addIssue({ code: 'custom', path: ['id'], message: 'Index cell identity requires a Matrix id.' });
    const seen = new Set<string>();
    node.items?.forEach((row, rowIndex) =>
      row.forEach((cell, columnIndex) => {
        const explicit = typeof cell === 'string' ? undefined : cell.id;
        const ids = new Set<string>();
        if (explicit !== undefined) ids.add(explicit);
        if (node.cellIdMode === 'index' && node.id !== undefined) ids.add(`${node.id}-${rowIndex}-${columnIndex}`);

        for (const id of ids) {
          if (seen.has(id))
            context.addIssue({
              code: 'custom',
              path: ['items', rowIndex, columnIndex, 'id'],
              message: `Duplicate cell id '${id}'.`,
            });

          seen.add(id);
        }
      }),
    );
  })
  .describe('Rectangular cells from explicit items, JSON data, or a schematic skeleton.');
