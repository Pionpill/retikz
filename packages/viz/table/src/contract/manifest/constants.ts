/** Table border contribution 的闭合来源类型 */
export const TableBorderContributionOrigin = {
  /** 显式 Table、Cell 或 rule border */
  Explicit: 'explicit',
  /** resolved style token border */
  StyleToken: 'styleToken',
} as const;
