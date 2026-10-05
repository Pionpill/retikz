import type { infer as ZodInfer, input as ZodInput } from 'zod';

import type {
  OverlayLayoutArtifactSchema,
  OverlayLayoutItemSchema,
  OverlayLayoutSchema,
  OverlayPlacementSchema,
} from './schema';

/** Overlay placement 的 canonical JSON IR */
export type IROverlayPlacement = ZodInput<typeof OverlayPlacementSchema>;

/** Overlay placement 的作者输入 */
export type OverlayPlacementInput = ZodInput<typeof OverlayPlacementSchema>;

/** OverlayLayout item 的 canonical JSON IR */
export type IROverlayLayoutItem = Omit<ZodInput<typeof OverlayLayoutItemSchema>, 'child'> &
  Pick<ZodInfer<typeof OverlayLayoutItemSchema>, 'child'>;

/** OverlayLayout item 的作者输入 */
export type OverlayLayoutItemInput = IROverlayLayoutItem;

/** OverlayLayout 的 canonical JSON IR */
export type IROverlayLayout = Omit<ZodInput<typeof OverlayLayoutSchema>, 'children'> & {
  /** 作者声明的直属子项，省略时按空列表处理
   * @default []
   */
  children?: Array<IROverlayLayoutItem>;
};

/** OverlayLayout factory 接受的作者输入 */
export type OverlayLayoutInput = Omit<IROverlayLayout, 'namespace' | 'type'>;

/** OverlayLayout 的 JSON-safe compile artifact payload */
export type OverlayLayoutArtifact = ZodInfer<typeof OverlayLayoutArtifactSchema>;
