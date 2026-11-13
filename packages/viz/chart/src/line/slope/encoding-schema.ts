import { NonBlankStringSchema } from '@retikz/foundation';
import { OrdinalScaleSchema, PlotFacetOptionsSchema } from '@retikz/plot';
import { strictObject, union } from 'zod';

import { ChartPartitionEncodingSchema, ChartPositionScaleBindingSchema } from '../../_chart/schemas';
import { createChartDirectMappingSchema, createChartScaleBindingSchema } from '../../_chart/schemas/encoding';

/** 坡度图数值字段；不对配对行进行隐式聚合 */
export const SlopeValueEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(ChartPositionScaleBindingSchema),
]);

/** 坡度图分类颜色字段 */
export const SlopeColorEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(createChartScaleBindingSchema(OrdinalScaleSchema)),
]);

/** 坡度图精确字段角色 */
export const SlopeChartEncodingsSchema = strictObject({
  entity: union([NonBlankStringSchema, createChartDirectMappingSchema()]),
  start: SlopeValueEncodingSchema,
  end: SlopeValueEncodingSchema,
  color: SlopeColorEncodingSchema.optional(),
  row: ChartPartitionEncodingSchema.optional(),
  column: ChartPartitionEncodingSchema.optional(),
  facet: PlotFacetOptionsSchema.optional(),
})
  .superRefine((encodings, context) => {
    if (encodings.facet !== undefined && encodings.row === undefined && encodings.column === undefined) {
      context.addIssue({ code: 'custom', path: ['facet'], message: 'Slope facet options require row or column' });
    }
    const scaleName = (mapping: typeof encodings.start): string | undefined => {
      if (typeof mapping === 'string' || mapping.scale === undefined) return undefined;
      const parsed = ChartPositionScaleBindingSchema.safeParse(mapping.scale);
      if (!parsed.success) return undefined;
      const scale = parsed.data;
      return 'reference' in scale ? scale.reference : scale.operation.name;
    };
    const start = scaleName(encodings.start);
    const end = scaleName(encodings.end);
    if (start !== undefined && end !== undefined && start !== end) {
      context.addIssue({
        code: 'custom',
        path: ['end', 'scale'],
        message: 'Slope endpoints must share the same y scale',
      });
    }
  })
  .describe('Slope paired-row field encodings');
