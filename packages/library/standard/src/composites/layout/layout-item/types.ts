import type { z } from 'zod';

import type { LayoutItemSchema } from './schema';

/** 三种 Standard layout item canonical IR 的判别联合 */
export type IRLayoutItem = z.infer<typeof LayoutItemSchema>;
