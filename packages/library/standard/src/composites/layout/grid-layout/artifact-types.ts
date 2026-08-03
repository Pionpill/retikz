import type { z } from 'zod';

import type { GridLayoutArtifactSchema } from './artifact-schema';

/** GridLayout 的 JSON-safe compile artifact payload */
export type GridLayoutArtifact = z.infer<typeof GridLayoutArtifactSchema>;
