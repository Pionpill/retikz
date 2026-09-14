import type { FrameInput, IRFrame } from './types';

import { STANDARD_NAMESPACE } from '../../shared';

/** 创建稀疏持久化的 Standard Frame composite */
export const createFrame = (input: FrameInput): IRFrame => ({
  namespace: STANDARD_NAMESPACE,
  type: 'frame',
  ...input,
});
