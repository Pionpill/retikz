import { z } from 'zod';

import { DataFieldType, FieldOrderMode } from './constants';

export const FieldFormatSchema = z
  .string()
  .min(1)
  .describe(
    'Field value-parsing format name. It is resolved against the FieldFormatDefinition registry at lowering time; built-in and custom formats share the same lookup path',
  );

export const FieldDefSchema = z
  .strictObject({
    name: z.string().min(1).describe('Field name as referenced by encoding channels (a path accessor like "a.b.c")'),
    type: z
      .enum(DataFieldType)
      .optional()
      .describe(
        'Field measurement type; omit to infer from the bound dataset at lowering. When given, drives type-driven scale selection and guide formatting without seeing the data',
      ),
    format: FieldFormatSchema.optional().describe(
      'Declarative value-parsing format name; each resolved definition binds to one measurement type and must be compatible with type (it also implies type when type is omitted). Omit for the built-in default coercion',
    ),
    order: z
      .union([z.enum(FieldOrderMode), z.array(z.union([z.string(), z.number()])).min(1)])
      .optional()
      .describe(
        'Category order for a categorical field. Omit or `data` keeps first appearance; ascending/descending sorts values; an explicit list pins listed values first and appends other values by appearance.',
      ),
  })
  .describe(
    'One field declaration: a field name, optionally its measurement type (inferred from data when omitted) and a declarative value-parsing format',
  );

export const DataModelSchema = z
  .array(FieldDefSchema)
  .describe(
    'Optional external data field declarations. Declared names enable strict reference checking; declared types drive scale selection, while omitted types are inferred from the bound dataset.',
  );

export const DataRefSchema = z
  .strictObject({
    reference: z
      .string()
      .min(1)
      .describe(
        'Name of an externally-supplied dataset; resolved by the host lowering pipeline at compile time. The dataset values never enter the IR.',
      ),
    model: DataModelSchema.optional().describe('Optional data model (field declarations)'),
  })
  .describe('Data binding stored in the IR: a named dataset reference plus an optional model. Carries no data values.');

export const ScalarValueSchema = z
  .union([z.string(), z.number(), z.boolean(), z.null()])
  .describe(
    'A single scalar value: string / number / boolean / null. The leaf a field path must resolve to, and the literal type of a constant channel.',
  );
