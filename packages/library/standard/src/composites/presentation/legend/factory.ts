import type { IRLegend, LegendInput } from './types';

import { STANDARD_NAMESPACE } from '../../shared';

/** 创建稀疏持久化的 Standard Legend composite */
export const createLegend = (input: LegendInput): IRLegend => ({
  namespace: STANDARD_NAMESPACE,
  type: 'legend',
  ...input,
});
