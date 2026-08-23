import type { z } from 'zod';

import type { EntitySchema } from './schema';

export type IRGraphEntity = z.infer<typeof EntitySchema>;
