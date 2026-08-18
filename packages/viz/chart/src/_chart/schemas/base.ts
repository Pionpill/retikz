import { PlotSchema } from '@retikz/plot';
import { z } from 'zod';

import { BaseChartType, CHART_NAMESPACE, ChartCommonFieldShape, omitUndefinedProperties } from '../../_shared';

export const BaseChartSchema = z
  .strictObject({
    namespace: z.literal(CHART_NAMESPACE).describe('Chart namespace discriminator'),
    type: z.literal(BaseChartType.Base).describe('Base Chart type discriminator'),
    ...ChartCommonFieldShape,
    plot: PlotSchema.describe('Complete Plot Source IR owned by the Base Chart'),
  })
  .describe('Base Chart Source IR')
  .overwrite(omitUndefinedProperties);

export type IRBaseChart = z.infer<typeof BaseChartSchema>;
