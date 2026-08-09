import type { z } from 'zod';

import type { CalloutArtifactSchema, CalloutPlacementSchema, CalloutSchema } from './schema';

/** Callout placement canonical type */
export type CalloutPlacement = z.infer<typeof CalloutPlacementSchema>;

/** Callout placement author input */
export type CalloutPlacementInput = z.input<typeof CalloutPlacementSchema>;

/** Callout canonical IR */
export type IRCallout = z.infer<typeof CalloutSchema>;

/** Callout resolved compile artifact */
export type CalloutArtifact = z.infer<typeof CalloutArtifactSchema>;

/** Callout resolved leader geometry */
export type CalloutLeaderArtifact = NonNullable<CalloutArtifact['leader']>;

/** Callout factory input */
export type CalloutInput = Omit<z.input<typeof CalloutSchema>, 'namespace' | 'type'>;
