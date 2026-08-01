import type { z } from 'zod';

import type { TableFormatterRefSchema } from './schema';

/** Cell formatter provider 引用 */
export type IRTableFormatterRef = z.infer<typeof TableFormatterRefSchema>;
