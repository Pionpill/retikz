import type { z } from 'zod';

import type { GraphPredicateRefSchema } from './schema';

export type IRGraphPredicateRef = z.infer<typeof GraphPredicateRefSchema>;
