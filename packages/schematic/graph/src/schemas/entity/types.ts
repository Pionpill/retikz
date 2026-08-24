import type { infer as ZodInfer } from 'zod';

import type { EntitySchema } from './schema';

export type IRGraphEntity = ZodInfer<typeof EntitySchema>;
