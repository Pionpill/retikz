import type { infer as ZodInfer } from 'zod';

import type { TableCellVisualEncodingSchema, TableVisualScaleRefSchema } from './schema';

/** Table visual scale 的 JSON-safe 引用 */
export type IRTableVisualScaleRef = ZodInfer<typeof TableVisualScaleRefSchema>;

/** 表格单元格的有序视觉编码 IR */
export type IRTableCellVisualEncoding = ZodInfer<typeof TableCellVisualEncodingSchema>;
