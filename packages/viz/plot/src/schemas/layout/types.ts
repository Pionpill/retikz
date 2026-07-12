import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type {
  LayoutAnchor,
  LayoutCollisionStrategy,
  LayoutPlacementKind,
  LayoutPlacementTarget,
  PlotLabelOverflow,
  PlotLabelRole,
  PlotLabelType,
  PlotLayoutMode,
} from './constants';
import type { LayoutPlacementSchema, PlotLabelSchema, PlotLayoutSchema } from './schema';

export type PlotLayoutModeValue = ValueOf<typeof PlotLayoutMode>;

export type LayoutCollisionStrategyValue = ValueOf<typeof LayoutCollisionStrategy>;

export type LayoutPlacementTargetValue = ValueOf<typeof LayoutPlacementTarget>;

export type LayoutPlacementKindValue = ValueOf<typeof LayoutPlacementKind>;

export type PlotLabelTypeValue = ValueOf<typeof PlotLabelType>;

export type PlotLabelRoleValue = ValueOf<typeof PlotLabelRole>;

export type PlotLabelOverflowValue = ValueOf<typeof PlotLabelOverflow>;

export type LayoutAnchorValue = ValueOf<typeof LayoutAnchor>;

/** Plot 全局布局策略。 */
export type PlotLayout = z.infer<typeof PlotLayoutSchema>;

/** Plot label 位置声明。 */
export type LayoutPlacement = z.infer<typeof LayoutPlacementSchema>;

/** Plot label 条目。 */
export type PlotLabel = z.infer<typeof PlotLabelSchema>;
