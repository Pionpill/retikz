import type { z } from 'zod';

import type { EntitySchema } from './schema';

/** Entity 的规范 IR */
export type IREntity = z.infer<typeof EntitySchema>;
