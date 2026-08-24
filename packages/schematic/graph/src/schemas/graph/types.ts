import type { infer as ZodInfer } from 'zod';

import type { GraphSchema } from './schema';

/** JSON-safe Graph Source root */
export type IRGraph = ZodInfer<typeof GraphSchema>;
