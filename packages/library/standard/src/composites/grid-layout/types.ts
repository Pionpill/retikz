import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type { GridAutoFlow, GridOverlap } from './constants';
import type {
  GridLayoutItemSchema,
  GridLayoutSchema,
  GridPlacementSchema,
  GridTrackBreadthSchema,
  GridTrackSchema,
} from './schema';

/** GridLayout 自动放置流向取值 */
export type GridAutoFlowValue = ValueOf<typeof GridAutoFlow>;

/** GridLayout fully explicit overlap 策略取值 */
export type GridOverlapValue = ValueOf<typeof GridOverlap>;

/** Grid track breadth 的 canonical JSON IR */
export type IRGridTrackBreadth = z.infer<typeof GridTrackBreadthSchema>;

/** Grid track breadth 的作者输入 */
export type GridTrackBreadthInput = z.input<typeof GridTrackBreadthSchema>;

/** Grid track 的 canonical JSON IR */
export type IRGridTrack = z.infer<typeof GridTrackSchema>;

/** Grid track 的作者输入 */
export type GridTrackInput = z.input<typeof GridTrackSchema>;

/** Grid 单轴 placement 的 canonical JSON IR */
export type IRGridPlacement = z.infer<typeof GridPlacementSchema>;

/** Grid 单轴 placement 的作者输入 */
export type GridPlacementInput = z.input<typeof GridPlacementSchema>;

/** GridLayout item 的 canonical JSON IR */
export type IRGridLayoutItem = z.infer<typeof GridLayoutItemSchema>;

/** GridLayout item 的作者输入 */
export type GridLayoutItemInput = z.input<typeof GridLayoutItemSchema>;

/** GridLayout 的 canonical JSON IR */
export type IRGridLayout = z.infer<typeof GridLayoutSchema>;

/** GridLayout factory 接受的作者输入 */
export type GridLayoutInput = Omit<z.input<typeof GridLayoutSchema>, 'namespace' | 'type'>;
