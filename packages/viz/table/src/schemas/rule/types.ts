import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type { TableValueCompareOperator, TableValuePredicateKind } from './constants';
import type { TableCellRuleSchema, TableCellSelectorSchema, TableValuePredicateSchema } from './schema';

/** Table value predicate 判别值 */
export type TableValuePredicateKindValue = ValueOf<typeof TableValuePredicateKind>;

/** Table value compare 运算符 */
export type TableValueCompareOperatorValue = ValueOf<typeof TableValueCompareOperator>;

/** Table Cell selector IR */
export type IRTableCellSelector = ZodInfer<typeof TableCellSelectorSchema>;

/** Table raw scalar predicate IR */
export type IRTableValuePredicate = ZodInfer<typeof TableValuePredicateSchema>;

/** Ordered Table Cell rule IR */
export type IRTableCellRule = ZodInfer<typeof TableCellRuleSchema>;
