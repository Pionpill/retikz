import type { infer as ZodInfer } from 'zod';

import type { TableCellRuleSchema, TableCellSelectorSchema, TableValuePredicateSchema } from './schema';

/** Table Cell selector IR */
export type IRTableCellSelector = ZodInfer<typeof TableCellSelectorSchema>;

/** Table raw scalar predicate IR */
export type IRTableValuePredicate = ZodInfer<typeof TableValuePredicateSchema>;

/** Ordered Table Cell rule IR */
export type IRTableCellRule = ZodInfer<typeof TableCellRuleSchema>;
