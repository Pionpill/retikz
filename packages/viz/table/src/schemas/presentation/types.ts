import type { z } from 'zod';

import type { TablePresentationRefSchema } from './schema';

/** Cell presentation provider 引用 */
export type IRTablePresentationRef = z.infer<typeof TablePresentationRefSchema>;
