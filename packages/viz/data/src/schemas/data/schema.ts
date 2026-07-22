import { z } from 'zod';

import { DataFieldType, FieldOrderMode } from './constants';

export const FieldFormatSchema = z.string().min(1).describe('Field value-parsing format name; built-in or custom');

export const FieldDefinitionSchema = z
  .strictObject({
    name: z.string().min(1).describe('Field name or dotted path'),
    type: z.enum(DataFieldType).optional().describe('Field measurement type; omitted means infer from data'),
    format: FieldFormatSchema.optional().describe('Value-parsing format; omitted means default coercion'),
    order: z
      .union([z.enum(FieldOrderMode), z.array(z.union([z.string(), z.number()])).min(1)])
      .optional()
      .describe('Category order; omitted means appearance order'),
  })
  .describe('Field declaration for type, format, and category order');

export const DataModelSchema = z
  .array(FieldDefinitionSchema)
  .superRefine((fields, ctx) => {
    const names = new Set<string>();
    fields.forEach((field, index) => {
      if (names.has(field.name)) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'name'],
          message: `duplicate data model field "${field.name}"`,
        });
      }
      names.add(field.name);
    });
  })
  .describe('External data field declarations with unique names');

export const DataReferenceSchema = z
  .strictObject({
    reference: z.string().min(1).describe('External dataset name; data values stay outside the IR'),
    model: DataModelSchema.optional().describe('Optional field declarations'),
  })
  .describe('IR data binding by external dataset name');

export const ScalarValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]).describe('JSON scalar value');
