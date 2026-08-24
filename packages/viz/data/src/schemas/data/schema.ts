import { createOpenStringSchema, NonBlankStringSchema } from '@retikz/foundation';
import { array, boolean, enum as zodEnum, null as zodNull, number, strictObject, string, union } from 'zod';

import { DataFieldFormat, DataFieldType, FieldOrderMode } from './constants';

export const FieldFormatSchema = createOpenStringSchema(DataFieldFormat).describe(
  'Field value-parsing format name; built-in or custom.',
);

export const FieldDefinitionSchema = strictObject({
  name: NonBlankStringSchema.describe('Field name or dotted path'),
  type: zodEnum(DataFieldType).optional().describe('Field measurement type; omitted means infer from data'),
  format: FieldFormatSchema.optional().describe('Value-parsing format; omitted means default coercion'),
  order: union([zodEnum(FieldOrderMode), array(union([string(), number()])).min(1)])
    .optional()
    .describe('Category order; omitted means appearance order'),
}).describe('Field declaration for type, format, and category order');

export const DataModelSchema = array(FieldDefinitionSchema)
  .superRefine((fields, context) => {
    const names = new Set<string>();
    fields.forEach((field, index) => {
      if (names.has(field.name)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'name'],
          message: `duplicate data model field "${field.name}"`,
        });
      }
      names.add(field.name);
    });
  })
  .describe('External data field declarations with unique names');

export const DataReferenceSchema = strictObject({
  reference: NonBlankStringSchema.describe('External dataset name; data values stay outside the IR'),
  model: DataModelSchema.optional().describe('Optional field declarations'),
}).describe('IR data binding by external dataset name');

export const ScalarValueSchema = union([string(), number(), boolean(), zodNull()]).describe('JSON scalar value');
