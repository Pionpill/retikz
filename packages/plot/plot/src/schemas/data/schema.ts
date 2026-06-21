import { z } from 'zod';
import { BUILTIN_FIELD_FORMATS, PlotFieldFormat, PlotFieldType } from './constants';

export const CustomFieldFormatSchema = z
  .string()
  .min(1)
  .refine(name => !BUILTIN_FIELD_FORMATS.has(name), { message: 'Custom field format name must not collide with a built-in format' })
  .describe('Discriminator: custom field format name; must be a non-empty, non-built-in identifier registered through options.formatDefinitions');

export const FieldFormatSchema = z
  .union([z.enum(PlotFieldFormat), CustomFieldFormatSchema])
  .describe(
    'Field value-parsing format: a built-in format keyword, or a custom format name validated at lowering time against the matching FieldFormatDefinition supplied via options.formatDefinitions',
  );

export const FieldDefSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .describe('Field name as referenced by encoding channels (a path accessor like "a.b.c")'),
    type: z
      .enum(PlotFieldType)
      .optional()
      .describe('Field measurement type; omit to infer from the bound dataset at lowering. When given, drives type-driven scale selection and guide formatting without seeing the data'),
    format: FieldFormatSchema.optional().describe(
      'Declarative value-parsing format; each format binds to one measurement type and must be compatible with type (it also implies type when type is omitted). A built-in keyword or a custom name registered via options.formatDefinitions. Omit for the built-in default coercion',
    ),
    order: z
      .union([z.enum(['data', 'ascending', 'descending']), z.array(z.union([z.string(), z.number()])).min(1)])
      .optional()
      .describe(
        "Category order for a categorical field: data appearance (default), ascending/descending sort, or an explicit value list. A non-default order marks the field as ordered. Drives the categorical domain for both band/point position and ordinal color, keeping position and color in the same order. Only valid on categorical fields; values present in the data but absent from an explicit list are appended at the end",
      ),
  })
  .describe('One field declaration: a field name, optionally its measurement type (inferred from data when omitted) and a declarative value-parsing format');

export const DataModelSchema = z
  .array(FieldDefSchema)
  .describe(
    'Optional declaration of the external data fields. Listing a field name enables strict reference checking and portable field binding; a given field type also validates and selects scales without seeing the data, while fields with the type omitted are inferred from the bound dataset at lowering. Omit the whole model to infer everything.',
  );

export const DataRefSchema = z
  .object({
    reference: z
      .string()
      .min(1)
      .describe(
        'Name of an externally-supplied dataset; resolved against lowerPlots(datasets) at compile time. The dataset values never enter the IR.',
      ),
    model: DataModelSchema.optional().describe('Optional data model (field declarations)'),
  })
  .describe('Data binding stored in the IR: a named dataset reference plus an optional model. Carries no data values.');

export const ScalarValueSchema = z
  .union([z.string(), z.number(), z.boolean(), z.null()])
  .describe(
    'A single scalar value: string / number / boolean / null. The leaf a field path must resolve to, and the literal type of a constant channel.',
  );
