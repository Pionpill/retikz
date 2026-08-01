import type { z } from 'zod';

import type { TableValueCompareOperator, TableValuePredicateKind } from './constants';
import type { TableCellRuleSchema, TableCellSelectorSchema, TableValuePredicateSchema } from './schema';

/** Table value predicate 判别值 */
export type TableValuePredicateKindValue =
  (typeof TableValuePredicateKind)[keyof typeof TableValuePredicateKind];

/** Table value compare 运算符 */
export type TableValueCompareOperatorValue =
  (typeof TableValueCompareOperator)[keyof typeof TableValueCompareOperator];

/** Table Cell selector IR */
export type IRTableCellSelector = z.infer<typeof TableCellSelectorSchema>;

/** Table raw scalar predicate IR */
export type IRTableValuePredicate = z.infer<typeof TableValuePredicateSchema>;

/** Ordered Table Cell rule IR */
export type IRTableCellRule = z.infer<typeof TableCellRuleSchema>;
