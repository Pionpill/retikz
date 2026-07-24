import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type { TableCellLocation, TableCellPayloadKind, TableCellRole } from './constants';
import type {
  TableCellAddressSchema,
  TableCellContentPayloadSchema,
  TableCellPayloadSchema,
  TableCellSchema,
  TableCellValuePayloadSchema,
} from './schema';

/** Cell 语义位置取值 */
export type TableCellLocationValue = ValueOf<typeof TableCellLocation>;

/** Cell 语义角色取值 */
export type TableCellRoleValue = ValueOf<typeof TableCellRole>;

/** Table Cell payload 判别值 */
export type TableCellPayloadKindValue = ValueOf<typeof TableCellPayloadKind>;

/** 零基 Cell 地址 */
export type IRTableCellAddress = z.infer<typeof TableCellAddressSchema>;

/** Cell 内容 payload */
export type IRTableCellPayload = z.infer<typeof TableCellPayloadSchema>;

/** 数据值 Cell payload */
export type IRTableCellValuePayload = z.infer<typeof TableCellValuePayloadSchema>;

/** 直接内容 Cell payload */
export type IRTableCellContentPayload = z.infer<typeof TableCellContentPayloadSchema>;

/** 显式 manual Table Cell */
export type IRTableCell = z.infer<typeof TableCellSchema>;
