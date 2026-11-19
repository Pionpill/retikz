import { CompositeBaseSchema } from '@retikz/core';
import { DataReferenceSchema, DataExecutionSchema, DataTransformDeclarationSchema } from '@retikz/data';
import { JsonObjectSchema, NonBlankStringSchema } from '@retikz/foundation';
import type {
  infer as ZodInfer,
  RefinementCtx,
  strictObject,
  ZodArray,
  ZodLiteral,
  ZodNever,
  ZodOptional,
  ZodType,
} from 'zod';
import { array, literal, never, union } from 'zod';

import { TableAppearanceDefaultsSchema } from '../appearance';
import { TableCellVisualEncodingSchema } from '../encoding';
import { TableLayoutSchema } from '../layout';
import { TableCellRuleSchema } from '../rule';
import { CustomTableStructureSchema, DetailTableStructureSchema, ManualTableStructureSchema } from '../structure';
import { TableCellLayoutDefaultsSchema, TableDefaultsSchema, TableVisualDefaultsSchema } from '../style';
import { TABLE_NAMESPACE, TableComposite } from './constants';

type TableBaseShape = {
  namespace: ZodLiteral<typeof TABLE_NAMESPACE>;
  type: ZodLiteral<typeof TableComposite.Table>;
  id: ZodOptional<typeof NonBlankStringSchema>;
  defaultCellLayout: ZodOptional<typeof TableCellLayoutDefaultsSchema>;
  defaultAppearance: ZodOptional<typeof TableAppearanceDefaultsSchema>;
  layout: ZodOptional<typeof TableLayoutSchema>;
  meta: ZodOptional<typeof JsonObjectSchema>;
  rules: ZodOptional<ZodArray<typeof TableCellRuleSchema>>;
  encodings: ZodOptional<ZodArray<typeof TableCellVisualEncodingSchema>>;
  defaultVisual: ZodOptional<typeof TableVisualDefaultsSchema>;
  defaultTable: ZodOptional<typeof TableDefaultsSchema>;
};

type BoundTableDataShape = {
  transform: ZodOptional<ZodArray<typeof DataTransformDeclarationSchema>>;
  dataExecution: ZodOptional<typeof DataExecutionSchema>;
};

const TableBaseSchema = CompositeBaseSchema.extend({
  namespace: literal(TABLE_NAMESPACE).describe(
    'Tier 2 namespace that routes this node to the Table composite definition.',
  ),
  type: literal(TableComposite.Table).describe('Composite type for the top-level Table specification.'),
  id: NonBlankStringSchema.optional().describe('Optional stable Table id used by the lowered root Scope.'),
  defaultCellLayout: TableCellLayoutDefaultsSchema.optional().describe(
    'Padding defaults for existing body and column-header Cells; explicit Cell padding wins.',
  ),
  defaultAppearance: TableAppearanceDefaultsSchema.optional().describe(
    'Sparse appearance defaults for existing body and column-header Cells.',
  ),
  layout: TableLayoutSchema.optional().describe(
    'Two-dimensional Table track, gap, and border layout options. Omitted fields use the pipeline defaults.',
  ),
  meta: JsonObjectSchema.optional().describe('Opaque JSON-safe metadata preserved by Table lowering.'),
  rules: array(TableCellRuleSchema).optional().describe('Ordered root Cell rules applied by declaration order.'),
  encodings: array(TableCellVisualEncodingSchema)
    .optional()
    .describe('Ordered Table Cell visual encodings. Omission is runtime-equivalent to an empty array.'),
  defaultVisual: TableVisualDefaultsSchema.optional().describe(
    'Sparse default ranges for existing Table builtin visual encodings.',
  ),
  defaultTable: TableDefaultsSchema.optional().describe(
    'Sparse Table defaults fragment restricted to appearance, Cell padding, border layout, and visual ranges.',
  ),
});

type InputTableRootSemantic = Readonly<{
  encodings?: ReadonlyArray<Readonly<{ id: string; legend?: false | Readonly<{ title?: string }> }>>;
}>;

const refineTableRoot = (spec: InputTableRootSemantic, context: RefinementCtx): void => {
  const seen = new Set<string>();
  spec.encodings?.forEach((encoding, index) => {
    if (seen.has(encoding.id)) {
      context.addIssue({ code: 'custom', path: ['encodings', index, 'id'], message: 'duplicate Table encoding id' });
    }

    seen.add(encoding.id);
  });
};

/** 校验绑定外部数据的可序列化明细表格组合节点 */
export const DetailTableSchema: ReturnType<
  typeof strictObject<
    TableBaseShape &
      BoundTableDataShape & { data: typeof DataReferenceSchema; structure: typeof DetailTableStructureSchema }
  >
> = TableBaseSchema.extend({
  transform: array(DataTransformDeclarationSchema)
    .optional()
    .describe('Ordered data transforms before Table structure resolution'),
  dataExecution: DataExecutionSchema.optional(),
  data: DataReferenceSchema.describe(
    'External dataset reference required by this detail Table. Actual rows stay outside the IR.',
  ),
  structure: DetailTableStructureSchema.describe('Record-per-row detail structure for this Table.'),
})
  .superRefine(refineTableRoot)
  .describe('JSON-safe detail Table composite specification bound to external data.');

/** 校验直接编写内容的表格组合节点，拒绝外部数据与数据执行选项 */
export const ManualTableSchema: ReturnType<
  typeof strictObject<
    TableBaseShape & {
      transform: ZodOptional<ZodNever>;
      dataExecution: ZodOptional<ZodNever>;
      data: ZodOptional<ZodNever>;
      structure: typeof ManualTableStructureSchema;
    }
  >
> = TableBaseSchema.extend({
  transform: never().optional().describe('Manual Table does not accept data transforms'),
  dataExecution: never().optional().describe('Manual Table does not accept data execution configuration'),
  data: never().optional().describe('Manual Table specifications do not accept an external dataset reference.'),
  structure: ManualTableStructureSchema.describe('Explicit row-major Cell matrix for this manual Table.'),
})
  .superRefine(refineTableRoot)
  .describe('JSON-safe manual Table composite specification with explicit content.');

/** 校验通过注册结构能力解析、可选择绑定外部数据的表格组合节点 */
export const CustomTableSchema: ReturnType<
  typeof strictObject<
    TableBaseShape &
      BoundTableDataShape & {
        data: ZodOptional<typeof DataReferenceSchema>;
        structure: typeof CustomTableStructureSchema;
      }
  >
> = TableBaseSchema.extend({
  transform: array(DataTransformDeclarationSchema)
    .optional()
    .describe('Ordered data transforms requiring a bound dataset'),
  dataExecution: DataExecutionSchema.optional(),
  data: DataReferenceSchema.optional().describe(
    'Optional external dataset reference exposed to the selected custom structure definition at runtime.',
  ),
  structure: CustomTableStructureSchema.describe('Custom Table structure operation resolved through the registry.'),
})
  .superRefine(refineTableRoot)
  .describe('JSON-safe custom Table composite specification resolved by a structure definition.');

type TableSchemaOutput =
  | ZodInfer<typeof DetailTableSchema>
  | ZodInfer<typeof ManualTableSchema>
  | ZodInfer<typeof CustomTableSchema>;

/** 校验明细、显式内容与自定义结构三种精确表格根变体 */
export const TableSchema: ZodType<TableSchemaOutput> = union([
  DetailTableSchema,
  ManualTableSchema,
  CustomTableSchema,
]).describe('JSON-safe Table composite specification covering the supported precise root variants.');
