import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type { TableVisualChannel } from './constants';
import type { TableCellVisualEncodingSchema, TableVisualScaleRefSchema } from './schema';

/** Table Cell 视觉编码通道 */
export type TableVisualChannelValue = ValueOf<typeof TableVisualChannel>;

/** Table visual scale 的 JSON-safe 引用 */
export type IRTableVisualScaleRef = ZodInfer<typeof TableVisualScaleRefSchema>;

/** Table Cell ordered visual encoding IR */
export type IRTableCellVisualEncoding = ZodInfer<typeof TableCellVisualEncodingSchema>;
