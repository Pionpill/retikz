import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer, input as ZodInput } from 'zod';

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
export type IROverlayPlacement = ZodInfer<typeof OverlayPlacementSchema>;

/** Overlay placement 的作者输入 */
export type OverlayPlacementInput = ZodInput<typeof OverlayPlacementSchema>;

/** OverlayLayout item 的 canonical JSON IR */
export type IROverlayLayoutItem = ZodInfer<typeof OverlayLayoutItemSchema>;

/** OverlayLayout item 的作者输入 */
export type OverlayLayoutItemInput = ZodInput<typeof OverlayLayoutItemSchema>;

/** OverlayLayout 的 canonical JSON IR */
export type IROverlayLayout = ZodInfer<typeof OverlayLayoutSchema>;

/** OverlayLayout factory 接受的作者输入 */
export type OverlayLayoutInput = Omit<ZodInput<typeof OverlayLayoutSchema>, 'namespace' | 'type'>;

/** OverlayLayout 的 JSON-safe compile artifact payload */
export type OverlayLayoutArtifact = ZodInfer<typeof OverlayLayoutArtifactSchema>;
