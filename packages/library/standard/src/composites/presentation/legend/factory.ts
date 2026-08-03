import type { IRLegend, LegendInput } from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { LegendSchema } from './schema';

/** 校验并创建持久化的 Standard Legend composite */
export const createLegend = (input: LegendInput): IRLegend =>
  LegendSchema.parse({
    namespace: STANDARD_NAMESPACE,
    type: 'legend',
    ...input,
  });
