import { STANDARD_NAMESPACE } from '../../shared';
import type { FrameInput, IRFrame } from './types';

/** 创建稀疏持久化的 Standard Frame composite */
export const createFrame = (input: FrameInput): IRFrame => ({
  namespace: STANDARD_NAMESPACE,
  type: 'frame',
  ...input,
});
