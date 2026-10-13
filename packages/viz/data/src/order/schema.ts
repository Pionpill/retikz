import type { ValueOf } from '@retikz/foundation';
import { NonBlankStringSchema } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';
import { strictObject, enum as zodEnum } from 'zod';

/** data 排序方向关键字 */
export const DataSortOrder = {
  /** 按字段值升序排序 */
  Ascending: 'ascending',
  /** 按字段值降序排序 */
  Descending: 'descending',
} as const;

/** data 排序方向取值 */
export type DataSortOrder = ValueOf<typeof DataSortOrder>;

/** row selector 排序规则 schema；用于 first / last / nth 等代表行选择 */
export const OrderBySchema = strictObject({
  field: NonBlankStringSchema.describe('Order field'),
  order: zodEnum(DataSortOrder).optional().describe('Sort direction; default ascending'),
}).describe('Row ordering rule');

/** selector 排序规则（代表行选择前的稳定排序规则） */
export type IRDataOrderBy = ZodInfer<typeof OrderBySchema>;
