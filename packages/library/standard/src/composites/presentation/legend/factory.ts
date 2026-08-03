import type { IRLegend, LegendInput } from './types';

import { LegendSchema } from './schema';

/** 校验并创建持久化的 Standard Legend composite */
export const createLegend = (input: LegendInput): IRLegend =>
  LegendSchema.parse({
    namespace: 'standard',
    type: 'legend',
    ...input,
  });
