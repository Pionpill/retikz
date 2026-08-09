import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type {
  LayoutAnchor,
  LayoutPlacementKind,
  LayoutPlacementTarget,
  PlotLabelRole,
  PlotLabelType,
  PlotLayoutMode,
} from './constants';
import type { LayoutPlacementSchema, PlotLabelSchema, PlotLayoutSchema } from './schema';

export type PlotLayoutModeValue = ValueOf<typeof PlotLayoutMode>;

export type LayoutPlacementTargetValue = ValueOf<typeof LayoutPlacementTarget>;

export type LayoutPlacementKindValue = ValueOf<typeof LayoutPlacementKind>;

export type PlotLabelTypeValue = ValueOf<typeof PlotLabelType>;

export type PlotLabelRoleValue = ValueOf<typeof PlotLabelRole>;

export type LayoutAnchorValue = ValueOf<typeof LayoutAnchor>;

/** Plot 全局布局策略 */
export type IRPlotLayout = z.infer<typeof PlotLayoutSchema>;

/** Plot label 位置声明 */
export type IRPlotLayoutPlacement = z.infer<typeof LayoutPlacementSchema>;

/** Plot label 条目 */
export type IRPlotLabel = z.infer<typeof PlotLabelSchema>;
