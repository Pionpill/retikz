import type { AxesInput, IRAxes } from './types';

import { STANDARD_NAMESPACE } from '../../shared';

/** 组装持久化的 Standard Axes composite */
export const createAxes = (input: AxesInput): IRAxes => ({
  namespace: STANDARD_NAMESPACE,
  type: 'axes',
  ...input,
});
