import type { infer as ZodInfer } from 'zod';

import type { TablePresentationRefSchema } from './schema';

/** Cell presentation provider 引用 */
export type IRTablePresentationRef = ZodInfer<typeof TablePresentationRefSchema>;
