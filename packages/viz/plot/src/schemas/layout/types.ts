import type { z } from 'zod';

import type { LayoutPlacementSchema, PlotLabelSchema, PlotLayoutSchema } from './schema';

/** Plot 全局布局策略。 */
export type PlotLayout = z.infer<typeof PlotLayoutSchema>;

/** Plot label 位置声明。 */
export type LayoutPlacement = z.infer<typeof LayoutPlacementSchema>;

/** Plot label 条目。 */
export type PlotLabel = z.infer<typeof PlotLabelSchema>;
