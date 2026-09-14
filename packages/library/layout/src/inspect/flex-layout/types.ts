import type { input as ZodInput } from 'zod';

import type { FlexLayoutInspectOptionsSchema } from './schema';

export type FlexLayoutInspectOptions = ZodInput<typeof FlexLayoutInspectOptionsSchema>;
