import type { AxesInput, IRAxes } from './types';

import { AxesSchema } from './schema';

/** 校验并创建持久化的 Standard Axes composite */
export const createAxes = (input: AxesInput): IRAxes =>
  AxesSchema.parse({
    namespace: 'standard',
    type: 'axes',
    ...input,
  });
