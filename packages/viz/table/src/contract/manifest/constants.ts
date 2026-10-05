import type { ValueOf } from '@retikz/foundation';

/** Table border contribution 的闭合来源类型 */
export const TableBorderContributionOrigin = {
  /** 显式 Table、Cell 或 rule border */
  Explicit: 'explicit',
  /** Table Source defaults 产生的 border */
  Defaults: 'defaults',
} as const;

/** Table border contribution 的闭合来源类型值 */
export type TableBorderContributionOrigin = ValueOf<typeof TableBorderContributionOrigin>;
