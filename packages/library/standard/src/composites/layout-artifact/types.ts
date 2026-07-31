import type { z } from 'zod';

import type { LayoutArtifactSchema } from './schema';

/** 三种 Standard layout compile artifact payload 的判别联合 */
export type LayoutArtifact = z.infer<typeof LayoutArtifactSchema>;
