import { STANDARD_NAMESPACE } from '../../shared';
import type { AxesInput, IRAxes } from './types';

/** 组装持久化的 Standard Axes composite */
export const createAxes = (input: AxesInput): IRAxes => ({
  namespace: STANDARD_NAMESPACE,
  type: 'axes',
  ...input,
});
