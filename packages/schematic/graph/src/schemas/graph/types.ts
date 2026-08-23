import type { z } from 'zod';

import type { GraphSchema } from './schema';

/** JSON-safe Graph Source root */
export type IRGraph = z.infer<typeof GraphSchema>;
