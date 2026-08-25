import type { infer as ZodInfer } from 'zod';

import type { TableFormatterRefSchema } from './schema';

/** Cell formatter provider 引用 */
export type IRTableFormatterRef = ZodInfer<typeof TableFormatterRefSchema>;
