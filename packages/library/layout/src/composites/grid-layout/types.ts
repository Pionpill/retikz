import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer, input as ZodInput } from 'zod';

import type { GridAutoFlow, GridOverlap, LayoutTrackSourceKind } from './constants';
import type {
  GridLayoutArtifactSchema,
  GridLayoutItemSchema,
  GridLayoutSchema,
  GridPlacementSchema,
  GridTrackBreadthSchema,
  GridTrackSchema,
  LayoutTrackArtifactSchema,
} from './schema';

/** GridLayout 自动放置流向取值 */
export type GridAutoFlowValue = ValueOf<typeof GridAutoFlow>;

/** GridLayout fully explicit overlap 策略取值 */
export type GridOverlapValue = ValueOf<typeof GridOverlap>;

/** Grid track breadth 的 canonical JSON IR */
export type IRGridTrackBreadth = ZodInfer<typeof GridTrackBreadthSchema>;

/** Grid track breadth 的作者输入 */
export type GridTrackBreadthInput = ZodInput<typeof GridTrackBreadthSchema>;

/** Grid track 的 canonical JSON IR */
export type IRGridTrack = ZodInfer<typeof GridTrackSchema>;

/** Grid track 的作者输入 */
export type GridTrackInput = ZodInput<typeof GridTrackSchema>;

/** Grid 单轴 placement 的 canonical JSON IR */
export type IRGridPlacement = ZodInfer<typeof GridPlacementSchema>;

/** Grid 单轴 placement 的作者输入 */
export type GridPlacementInput = ZodInput<typeof GridPlacementSchema>;

/** GridLayout item 的 canonical JSON IR */
export type IRGridLayoutItem = ZodInfer<typeof GridLayoutItemSchema>;

/** GridLayout item 的作者输入 */
export type GridLayoutItemInput = ZodInput<typeof GridLayoutItemSchema>;

/** GridLayout 的 canonical JSON IR */
export type IRGridLayout = ZodInfer<typeof GridLayoutSchema>;

/** GridLayout factory 接受的作者输入 */
export type GridLayoutInput = Omit<ZodInput<typeof GridLayoutSchema>, 'namespace' | 'type'>;

/** GridLayout 的 JSON-safe compile artifact payload */
export type GridLayoutArtifact = ZodInfer<typeof GridLayoutArtifactSchema>;

/** GridLayout 轨道产物来源取值 */
export type LayoutTrackSourceKindValue = ValueOf<typeof LayoutTrackSourceKind>;

/** GridLayout 的 resolved track artifact */
export type LayoutTrackArtifact = ZodInfer<typeof LayoutTrackArtifactSchema>;
