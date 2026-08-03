import type { z } from 'zod';

import type { OverlayLayoutArtifactSchema } from './artifact-schema';

/** OverlayLayout 的 JSON-safe compile artifact payload */
export type OverlayLayoutArtifact = z.infer<typeof OverlayLayoutArtifactSchema>;
