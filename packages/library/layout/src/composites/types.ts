import type { infer as ZodInfer } from 'zod';

import type { LayoutArtifactSchema, LayoutItemSchema } from './schema';

/** 三种 Layout compile artifact payload 的判别联合 */
export type LayoutArtifact = ZodInfer<typeof LayoutArtifactSchema>;

/** 三种 Layout item canonical IR 的判别联合 */
export type IRLayoutItem = ZodInfer<typeof LayoutItemSchema>;
