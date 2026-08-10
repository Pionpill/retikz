import type { z } from 'zod';

import type { OverlayLayoutInspectOptionsInputSchema, OverlayLayoutInspectOptionsSchema } from './schema';

/** Overlay 布局检查器的输入选项 */
export type OverlayLayoutInspectOptions = z.input<typeof OverlayLayoutInspectOptionsInputSchema>;

/** 完整解析后的 Overlay 布局检查器选项 */
export type ResolvedOverlayLayoutInspectOptions = z.output<typeof OverlayLayoutInspectOptionsSchema>;
