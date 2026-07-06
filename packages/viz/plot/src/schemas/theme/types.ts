import type { z } from 'zod';

import type { PlotAxisThemeSchema, PlotPaletteThemeSchema, PlotThemeSchema } from './schema';

/** Plot 主题：JSON-safe 的全局视觉默认值。 */
export type PlotTheme = z.infer<typeof PlotThemeSchema>;
/** Plot axis 主题默认值。 */
export type PlotAxisTheme = z.infer<typeof PlotAxisThemeSchema>;
/** Plot palette 主题默认值。 */
export type PlotPaletteTheme = z.infer<typeof PlotPaletteThemeSchema>;
