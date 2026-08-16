import type { z } from 'zod';

import type { GraphSchema } from './schema';

export type IRGraph = z.infer<typeof GraphSchema>;
