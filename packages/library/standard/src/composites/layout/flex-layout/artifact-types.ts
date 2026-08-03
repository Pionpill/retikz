import type { z } from 'zod';

import type { FlexLayoutArtifactSchema } from './artifact-schema';

/** FlexLayout 的 JSON-safe compile artifact payload */
export type FlexLayoutArtifact = z.infer<typeof FlexLayoutArtifactSchema>;
