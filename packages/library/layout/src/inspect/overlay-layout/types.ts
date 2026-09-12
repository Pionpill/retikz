import type { input as ZodInput } from 'zod';

import type { OverlayLayoutInspectOptionsSchema } from './schema';

export type OverlayLayoutInspectOptions = ZodInput<typeof OverlayLayoutInspectOptionsSchema>;
