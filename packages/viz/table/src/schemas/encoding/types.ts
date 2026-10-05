import type { infer as ZodInfer } from 'zod';

import type { TableCellVisualEncodingSchema, TableVisualScaleRefSchema } from './schema';

/** Table visual scale 的 JSON-safe 引用 */
export type IRTableVisualScaleRef = ZodInfer<typeof TableVisualScaleRefSchema>;

/** Table Cell ordered visual encoding IR */
export type IRTableCellVisualEncoding = ZodInfer<typeof TableCellVisualEncodingSchema>;
