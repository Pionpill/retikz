import type { input as ZodInput, output as ZodOutput } from 'zod';

import type { GridLayoutInspectOptionsInputSchema, GridLayoutInspectOptionsSchema } from './schema';

/** Grid 布局检查器的输入选项 */
export type GridLayoutInspectOptions = ZodInput<typeof GridLayoutInspectOptionsInputSchema>;

/** 完整解析后的 Grid 布局检查器选项 */
export type ResolvedGridLayoutInspectOptions = ZodOutput<typeof GridLayoutInspectOptionsSchema>;
