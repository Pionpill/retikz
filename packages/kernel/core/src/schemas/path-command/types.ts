import type { infer as ZodInfer } from 'zod';

import type { PathCommandSchema } from './schema';

export type IRPathCommand = ZodInfer<typeof PathCommandSchema>;
