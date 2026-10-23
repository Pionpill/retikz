import { CssColorSchema } from '@retikz/core';
import { ScalarValueSchema } from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import type { infer as ZodInfer, ZodType } from 'zod';
import { array, discriminatedUnion, enum as zodEnum, literal, never, number, strictObject, string } from 'zod';

import { TableVisualChannel } from '../../schemas';

const strictlyIncreasingEdges = (edges: ReadonlyArray<number>): boolean =>
  edges.every((edge, index) => index === 0 || edge > edges[index - 1]);

const TableLegendDescriptorBaseSchema = strictObject({
  encodingId: NonBlankStringSchema.describe('Owning Table visual encoding id.'),
  channel: zodEnum(TableVisualChannel).describe('Table Cell appearance channel described by this Legend.'),
  scaleName: NonBlankStringSchema.describe('Resolved Table visual scale definition name.'),
  title: string().optional().describe('Optional Table-owned Legend title.'),
  form: zodEnum(['ramp', 'swatch']).describe('Ramp or swatch Legend representation.'),
  domain: array(ScalarValueSchema).describe('Detached resolved visual scale domain.'),
  range: array(CssColorSchema).min(1).describe('Detached nonempty resolved color range.'),
  edges: array(number()).optional().describe('Optional strictly increasing threshold edges.'),
});

/** 校验一次表格视觉比例尺解析产生的可序列化图例描述 */
export const TableLegendDescriptorSchema: ZodType<ZodInfer<typeof TableLegendDescriptorBaseSchema>> =
  discriminatedUnion('form', [
    TableLegendDescriptorBaseSchema.extend({
      form: literal('ramp').describe('Continuous color ramp with exactly two endpoints.'),
      domain: TableLegendDescriptorBaseSchema.shape.domain.length(2),
      range: TableLegendDescriptorBaseSchema.shape.range.length(2),
      edges: never().optional().describe('Threshold edges are not accepted for a ramp.'),
    }),
    TableLegendDescriptorBaseSchema.extend({
      form: literal('swatch').describe('Discrete color swatches, optionally separated by threshold edges.'),
    }),
  ])
    .superRefine((descriptor, context) => {
      if (descriptor.edges !== undefined && !strictlyIncreasingEdges(descriptor.edges)) {
        context.addIssue({ code: 'custom', path: ['edges'], message: 'edges must be strictly increasing' });
      }

      if (descriptor.form === 'ramp') return;

      if (descriptor.edges === undefined) {
        if (descriptor.domain.length !== descriptor.range.length) {
          context.addIssue({ code: 'custom', message: 'swatch domain and range must have equal lengths' });
        }

        return;
      }

      if (
        descriptor.range.length !== descriptor.edges.length + 1 ||
        descriptor.domain.length !== descriptor.edges.length ||
        descriptor.domain.some((value, index) => typeof value !== 'number' || value !== descriptor.edges?.[index])
      ) {
        context.addIssue({
          code: 'custom',
          message: 'threshold swatch domain, range, and edges must describe one mapping',
        });
      }
    })
    .describe('Strict JSON-safe Table Legend descriptor produced from one visual scale resolution.');
