import { TextBlockSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { array, boolean, null as zodNull, number, strictObject, string, union } from 'zod';

export const PlotPartitionScalarSchema = union([string(), number(), boolean(), zodNull()]).describe(
  'Finite JSON scalar used by Plot partition ordering and facet panel identity',
);

const PlotPartitionLabelOverrideSchema = strictObject({
  value: PlotPartitionScalarSchema.describe('Partition value whose generated label is overridden'),
  label: TextBlockSchema.describe('Display text block used for this partition value'),
}).describe('Display label override for one partition value');

export const PlotPartitionDimensionSchema = strictObject({
  field: NonBlankStringSchema.describe('Data field path used to partition rows'),
  order: array(PlotPartitionScalarSchema)
    .optional()
    .describe('Explicit order for present partition values; other present values follow in first-seen order'),
  labels: array(PlotPartitionLabelOverrideSchema)
    .optional()
    .describe('Optional display labels for partition values; unmatched values fall back to String(value)'),
}).describe('Plot data partition dimension');

export const PlotPartitionDimensionsSchema = union([
  PlotPartitionDimensionSchema,
  array(PlotPartitionDimensionSchema).min(1),
]).describe('One or more Plot partition dimensions');
