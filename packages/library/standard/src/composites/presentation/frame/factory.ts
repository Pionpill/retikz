import type { FrameInput, IRFrame } from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { FrameSchema } from './schema';

/** 校验并创建持久化的 Standard Frame composite */
export const createFrame = (input: FrameInput): IRFrame =>
  FrameSchema.parse({
    namespace: STANDARD_NAMESPACE,
    type: 'frame',
    ...input,
  });
