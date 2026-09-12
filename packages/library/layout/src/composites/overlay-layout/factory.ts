import type { IROverlayLayout, OverlayLayoutInput } from './types';

import { LAYOUT_NAMESPACE } from '../../shared';

/** 创建应用全部 schema 默认值的 canonical OverlayLayout IR */
export const createOverlayLayout = (input: OverlayLayoutInput): IROverlayLayout => ({
  namespace: LAYOUT_NAMESPACE,
  type: 'overlayLayout',
  ...input,
});
