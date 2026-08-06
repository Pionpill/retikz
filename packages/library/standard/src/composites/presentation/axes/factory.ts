import type { AxesInput, IRAxes } from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { AxesSchema } from './schemas';

/** 校验并创建持久化的 Standard Axes composite */
export const createAxes = (input: AxesInput): IRAxes =>
  AxesSchema.parse({
    namespace: STANDARD_NAMESPACE,
    type: 'axes',
    ...input,
  });
