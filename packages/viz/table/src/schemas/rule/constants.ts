/** Table value predicate 的判别值 */
export const TableValuePredicateKind = {
  /** 严格标量相等 */
  Equal: 'equal',
  /** 严格标量集合成员 */
  OneOf: 'oneOf',
  /** 同型字符串或数值关系比较 */
  Compare: 'compare',
  /** 同型字符串或数值区间 */
  Between: 'between',
  /** null / non-null 判定 */
  Null: 'null',
} as const;

/** Table value compare predicate 的运算符 */
export const TableValueCompareOperator = {
  /** 小于 */
  LessThan: 'lt',
  /** 小于或等于 */
  LessThanOrEqual: 'lte',
  /** 大于 */
  GreaterThan: 'gt',
  /** 大于或等于 */
  GreaterThanOrEqual: 'gte',
} as const;
