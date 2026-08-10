import type { IROverlayLayout, OverlayLayoutInput } from './types';

import { LAYOUT_NAMESPACE } from '../../shared';
import { OverlayLayoutSchema } from './schema';

/** 创建应用全部 schema 默认值的 canonical OverlayLayout IR */
export const createOverlayLayout = (input: OverlayLayoutInput): IROverlayLayout =>
  OverlayLayoutSchema.parse({ namespace: LAYOUT_NAMESPACE, type: 'overlayLayout', ...input });
