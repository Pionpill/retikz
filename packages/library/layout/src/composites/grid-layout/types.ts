import type { infer as ZodInfer, input as ZodInput } from 'zod';

import type {
  GridLayoutArtifactSchema,
  GridLayoutItemSchema,
  GridLayoutSchema,
  GridPlacementSchema,
  GridTrackBreadthSchema,
  GridTrackSchema,
  LayoutTrackArtifactSchema,
} from './schema';

/** Grid track breadth 的 canonical JSON IR */
export type IRGridTrackBreadth = ZodInput<typeof GridTrackBreadthSchema>;

/** Grid track breadth 的作者输入 */
export type GridTrackBreadthInput = ZodInput<typeof GridTrackBreadthSchema>;

/** Grid track 的 canonical JSON IR */
export type IRGridTrack = ZodInput<typeof GridTrackSchema>;

/** Grid track 的作者输入 */
export type GridTrackInput = ZodInput<typeof GridTrackSchema>;

/** Grid 单轴 placement 的 canonical JSON IR */
export type IRGridPlacement = ZodInput<typeof GridPlacementSchema>;

/** Grid 单轴 placement 的作者输入 */
export type GridPlacementInput = ZodInput<typeof GridPlacementSchema>;

/** GridLayout item 的 canonical JSON IR */
export type IRGridLayoutItem = Omit<ZodInput<typeof GridLayoutItemSchema>, 'child'> &
  Pick<ZodInfer<typeof GridLayoutItemSchema>, 'child'>;

/** GridLayout item 的作者输入 */
export type GridLayoutItemInput = IRGridLayoutItem;

/** GridLayout 的 canonical JSON IR */
export type IRGridLayout = Omit<ZodInput<typeof GridLayoutSchema>, 'children'> & {
  /** 作者声明的直属子项，省略时按空列表处理
   * @default []
   */
  children?: Array<IRGridLayoutItem>;
};

/** GridLayout factory 接受的作者输入 */
export type GridLayoutInput = Omit<IRGridLayout, 'namespace' | 'type'>;

/** GridLayout 的 JSON-safe compile artifact payload */
export type GridLayoutArtifact = ZodInfer<typeof GridLayoutArtifactSchema>;

/** GridLayout 的 resolved track artifact */
export type LayoutTrackArtifact = ZodInfer<typeof LayoutTrackArtifactSchema>;
