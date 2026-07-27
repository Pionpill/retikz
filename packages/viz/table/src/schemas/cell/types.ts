import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type {
  TableCellFit,
  TableCellLocation,
  TableCellOverflow,
  TableCellPayloadKind,
  TableCellRole,
  TableHorizontalAlignment,
  TableVerticalAlignment,
} from './constants';
import type {
  TableCellAddressSchema,
  TableCellContentPayloadSchema,
  TableCellLayoutSchema,
  TableCellPayloadSchema,
  TableCellSchema,
  TableCellSpanSchema,
  TableCellValuePayloadSchema,
} from './schema';

/** Cell 语义位置取值 */
export type TableCellLocationValue = ValueOf<typeof TableCellLocation>;

/** Cell 语义角色取值 */
export type TableCellRoleValue = ValueOf<typeof TableCellRole>;

/** Table Cell payload 判别值 */
export type TableCellPayloadKindValue = ValueOf<typeof TableCellPayloadKind>;

/** Cell 横向对齐取值 */
export type TableHorizontalAlignmentValue = ValueOf<typeof TableHorizontalAlignment>;

/** Cell 纵向对齐取值 */
export type TableVerticalAlignmentValue = ValueOf<typeof TableVerticalAlignment>;

/** Cell 内容 fit 取值 */
export type TableCellFitValue = ValueOf<typeof TableCellFit>;

/** Cell 内容 overflow 取值 */
export type TableCellOverflowValue = ValueOf<typeof TableCellOverflow>;

/** 零基 Cell 地址 */
export type IRTableCellAddress = z.infer<typeof TableCellAddressSchema>;

/** Table Cell 矩形跨度 IR */
export type IRTableCellSpan = z.infer<typeof TableCellSpanSchema>;

/** Table Cell 布局策略 IR */
export type IRTableCellLayout = z.infer<typeof TableCellLayoutSchema>;

/** Cell 内容 payload */
export type IRTableCellPayload = z.infer<typeof TableCellPayloadSchema>;

/** 数据值 Cell payload */
export type IRTableCellValuePayload = z.infer<typeof TableCellValuePayloadSchema>;

/** 直接内容 Cell payload */
export type IRTableCellContentPayload = z.infer<typeof TableCellContentPayloadSchema>;

/** 显式 manual Table Cell */
export type IRTableCell = z.infer<typeof TableCellSchema>;
