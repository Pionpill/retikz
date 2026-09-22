import { STANDARD_NAMESPACE } from '../../shared';
import type { IRLegend, LegendInput } from './types';

/** 创建稀疏持久化的 Standard Legend composite */
export const createLegend = (input: LegendInput): IRLegend => ({
  namespace: STANDARD_NAMESPACE,
  type: 'legend',
  ...input,
});
