import type { infer as ZodInfer } from 'zod';

import type {
  TableCategoricalPaletteSchema,
  TableDefaultsSchema,
  TableLayoutDefaultsSchema,
  TableSequentialPaletteSchema,
  TableVisualDefaultsSchema,
} from './schema';

/** Table Source 的分类颜色默认序列 */
export type IRTableCategoricalPalette = ZodInfer<typeof TableCategoricalPaletteSchema>;

/** Table Source 的连续颜色端点默认序列 */
export type IRTableSequentialPalette = ZodInfer<typeof TableSequentialPaletteSchema>;

/** Table Source 的 visual encoding 默认片段 */
export type IRTableVisualDefaults = ZodInfer<typeof TableVisualDefaultsSchema>;

/** Table Source 的 layout 默认片段 */
export type IRTableLayoutDefaults = ZodInfer<typeof TableLayoutDefaultsSchema>;

/** Table Source 的稀疏 Table defaults 聚合片段 */
export type IRTableDefaults = ZodInfer<typeof TableDefaultsSchema>;
