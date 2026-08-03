import type { FrameInput, IRFrame } from './types';

import { FrameSchema } from './schema';

/** 校验并创建持久化的 Standard Frame composite */
export const createFrame = (input: FrameInput): IRFrame =>
  FrameSchema.parse({
    namespace: 'standard',
    type: 'frame',
    ...input,
  });
