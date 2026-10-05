import type { infer as ZodInfer } from 'zod';

import type { TableCellRuleSchema, TableCellSelectorSchema, TableValuePredicateSchema } from './schema';

/** 表格单元格选择器 IR */
export type IRTableCellSelector = ZodInfer<typeof TableCellSelectorSchema>;

/** 基于表格原始标量值的谓词 IR */
export type IRTableValuePredicate = ZodInfer<typeof TableValuePredicateSchema>;

/** 按顺序应用的表格单元格规则 IR */
export type IRTableCellRule = ZodInfer<typeof TableCellRuleSchema>;
