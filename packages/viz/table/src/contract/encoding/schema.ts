import { CssColorSchema } from '@retikz/core';
import { ScalarValueSchema } from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import { z } from 'zod';

import { TableVisualChannel } from '../../schemas';

const descriptorColorSchema = CssColorSchema.refine(value => NonBlankStringSchema.safeParse(value).success, {
  message: 'Table Legend descriptor color must not be empty or whitespace.',
});

const strictlyIncreasingEdges = (edges: ReadonlyArray<number>): boolean =>
  edges.every((edge, index) => index === 0 || edge > edges[index - 1]);

export const TableLegendDescriptorSchema = z
  .strictObject({
    encodingId: z.string().min(1).describe('Owning Table visual encoding id.'),
    channel: z.enum(TableVisualChannel).describe('Table Cell appearance channel described by this Legend.'),
    scaleName: z.string().min(1).describe('Resolved Table visual scale definition name.'),
    title: z.string().optional().describe('Optional Table-owned Legend title.'),
    form: z.enum(['ramp', 'swatch']).describe('Ramp or swatch Legend representation.'),
    domain: z.array(ScalarValueSchema).describe('Detached resolved visual scale domain.'),
    range: z.array(descriptorColorSchema).min(1).describe('Detached nonempty resolved color range.'),
    edges: z.array(z.number()).optional().describe('Optional strictly increasing threshold edges.'),
  })
  .superRefine((descriptor, context) => {
    if (descriptor.edges !== undefined && !strictlyIncreasingEdges(descriptor.edges)) {
      context.addIssue({ code: 'custom', path: ['edges'], message: 'edges must be strictly increasing' });
    }
    if (descriptor.form === 'ramp') {
      if (descriptor.domain.length !== 2 || descriptor.range.length !== 2 || descriptor.edges !== undefined) {
        context.addIssue({ code: 'custom', message: 'ramp requires two domain and range endpoints without edges' });
      }
      return;
    }
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
