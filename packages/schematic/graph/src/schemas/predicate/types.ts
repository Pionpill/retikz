import type { infer as ZodInfer } from 'zod';

import type { GraphPredicateRefSchema } from './schema';

export type IRGraphPredicateRef = ZodInfer<typeof GraphPredicateRefSchema>;
