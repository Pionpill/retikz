import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { LayoutSizeParticipation, OverlayPlacementKind } from './constants';
import type {
  OverlayLayoutArtifactSchema,
  OverlayLayoutItemSchema,
  OverlayLayoutSchema,
  OverlayPlacementSchema,
} from './schema';

/** Overlay placement 判别值 */
export type OverlayPlacementKindValue = ValueOf<typeof OverlayPlacementKind>;

/** Overlay 结构尺寸参与策略值 */
export type LayoutSizeParticipationValue = ValueOf<typeof LayoutSizeParticipation>;

/** Overlay placement 的 canonical JSON IR */
export type IROverlayPlacement = z.infer<typeof OverlayPlacementSchema>;

/** Overlay placement 的作者输入 */
export type OverlayPlacementInput = z.input<typeof OverlayPlacementSchema>;

/** OverlayLayout item 的 canonical JSON IR */
export type IROverlayLayoutItem = z.infer<typeof OverlayLayoutItemSchema>;

/** OverlayLayout item 的作者输入 */
export type OverlayLayoutItemInput = z.input<typeof OverlayLayoutItemSchema>;

/** OverlayLayout 的 canonical JSON IR */
export type IROverlayLayout = z.infer<typeof OverlayLayoutSchema>;

/** OverlayLayout factory 接受的作者输入 */
export type OverlayLayoutInput = Omit<z.input<typeof OverlayLayoutSchema>, 'namespace' | 'type'>;

/** OverlayLayout 的 JSON-safe compile artifact payload */
export type OverlayLayoutArtifact = z.infer<typeof OverlayLayoutArtifactSchema>;
