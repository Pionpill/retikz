import type { z } from 'zod';

import type { TableVisualChannel } from './constants';
import type { TableCellVisualEncodingSchema, TableVisualScaleRefSchema } from './schema';

/** Table Cell 视觉编码通道 */
export type TableVisualChannelValue = (typeof TableVisualChannel)[keyof typeof TableVisualChannel];

/** Table visual scale 的 JSON-safe 引用 */
export type IRTableVisualScaleRef = z.infer<typeof TableVisualScaleRefSchema>;

/** Table Cell ordered visual encoding IR */
export type IRTableCellVisualEncoding = z.infer<typeof TableCellVisualEncodingSchema>;
