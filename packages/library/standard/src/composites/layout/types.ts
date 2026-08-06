import type { z } from 'zod';

import type { LayoutArtifactSchema, LayoutItemSchema } from './schema';

/** 三种 Standard layout compile artifact payload 的判别联合 */
export type LayoutArtifact = z.infer<typeof LayoutArtifactSchema>;

/** 三种 Standard layout item canonical IR 的判别联合 */
export type IRLayoutItem = z.infer<typeof LayoutItemSchema>;
