import type { z } from 'zod';

import type { PlotSpecSchema } from './schema';

/** Plot IR 根节点（plot composite 节点） */
export type PlotSpec = z.infer<typeof PlotSpecSchema>;
