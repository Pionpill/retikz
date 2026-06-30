import type { z } from 'zod';

import type { PathCommandSchema } from './schema';

export type IRPathCommand = z.infer<typeof PathCommandSchema>;
