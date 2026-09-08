import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type { TableBorderKind, TableBorderMode } from './constants';
import type {
  TableBorderSchema,
  TableBordersDefaultsSchema,
  TableBordersSchema,
  TableCellBordersDefaultsSchema,
  TableCellBordersSchema,
  TableOuterBordersDefaultsSchema,
  TableOuterBordersSchema,
} from './schema';

/** Table border 候选判别值 */
export type TableBorderKindValue = ValueOf<typeof TableBorderKind>;

/** Table border 拓扑模式 */
export type TableBorderModeValue = ValueOf<typeof TableBorderMode>;

/** 单个 Table border 候选 IR */
export type IRTableBorder = ZodInfer<typeof TableBorderSchema>;

/** Cell 四侧 border 候选 IR */
export type IRTableCellBorders = ZodInfer<typeof TableCellBordersSchema>;

/** Table Cell 稀疏边框默认 IR */
export type IRTableCellBordersDefaults = ZodInfer<typeof TableCellBordersDefaultsSchema>;

/** Table outer boundary 的四侧稀疏 border 候选 IR */
export type IRTableOuterBorders = ZodInfer<typeof TableOuterBordersSchema>;

/** Table outer 稀疏边框默认 IR */
export type IRTableOuterBordersDefaults = ZodInfer<typeof TableOuterBordersDefaultsSchema>;

/** Table 根 border 默认与模式 IR */
export type IRTableBorders = ZodInfer<typeof TableBordersSchema>;

/** Table 稀疏边框布局默认 IR */
export type IRTableBordersDefaults = ZodInfer<typeof TableBordersDefaultsSchema>;
