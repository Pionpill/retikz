import type { ValueOf } from '@retikz/foundation';
/** Table composite namespace */
export const TABLE_NAMESPACE = 'table';

/** Table namespace 内的 composite 类型关键字 */
export const TableComposite = {
  /** 顶层 Table spec 节点 */
  Table: 'table',
} as const;

/** Table composite 类型 */
export type TableComposite = ValueOf<typeof TableComposite>;
