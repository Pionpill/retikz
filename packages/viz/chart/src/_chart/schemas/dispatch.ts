import { z } from 'zod';

import { CHART_NAMESPACE } from '../../_shared';

export const ChartDispatchSchema = z.object({
  namespace: z.literal(CHART_NAMESPACE).describe('Chart namespace discriminator'),
  type: z.string().min(1).describe('Chart type discriminator used for closed recipe lookup'),
});

export type ChartDispatch = z.infer<typeof ChartDispatchSchema>;
