import type { infer as ZodInfer } from 'zod';

import type {
  ManualTableCellSchema,
  TableCellContentPayloadSchema,
  TableCellLayoutSchema,
  TableCellPayloadSchema,
  TableCellSpanSchema,
  TableCellValuePayloadSchema,
} from './schema';

/** Table Cell 矩形跨度 IR */
export type IRTableCellSpan = ZodInfer<typeof TableCellSpanSchema>;

/** Table Cell 布局策略 IR */
export type IRTableCellLayout = ZodInfer<typeof TableCellLayoutSchema>;

/** Cell 内容 payload */
export type IRTableCellPayload = ZodInfer<typeof TableCellPayloadSchema>;

/** 数据值 Cell payload */
export type IRTableCellValuePayload = ZodInfer<typeof TableCellValuePayloadSchema>;

/** 直接内容 Cell payload */
export type IRTableCellContentPayload = ZodInfer<typeof TableCellContentPayloadSchema>;

/** 显式 manual Table Cell */
export type IRManualTableCell = ZodInfer<typeof ManualTableCellSchema>;
