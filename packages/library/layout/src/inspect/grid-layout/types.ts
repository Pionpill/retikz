import type { z } from 'zod';

import type { GridLayoutInspectOptionsInputSchema, GridLayoutInspectOptionsSchema } from './schema';

/** Grid 布局检查器的输入选项 */
export type GridLayoutInspectOptions = z.input<typeof GridLayoutInspectOptionsInputSchema>;

/** 完整解析后的 Grid 布局检查器选项 */
export type ResolvedGridLayoutInspectOptions = z.output<typeof GridLayoutInspectOptionsSchema>;
