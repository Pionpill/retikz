import type { z } from 'zod';

import type { TableLayoutSchema } from './schema';

/** 固定轨道 Table layout IR */
export type IRTableLayout = z.infer<typeof TableLayoutSchema>;
