import type { input as ZodInput } from 'zod';

import type { GridLayoutInspectOptionsSchema } from './schema';

export type GridLayoutInspectOptions = ZodInput<typeof GridLayoutInspectOptionsSchema>;
