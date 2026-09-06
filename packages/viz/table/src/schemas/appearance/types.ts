import type { infer as ZodInfer } from 'zod';

import type {
  TableAppearanceDefaultsSchema,
  TableCellAppearanceDefaultsSchema,
  TableCellAppearanceSchema,
  TableCellBackgroundDefaultsSchema,
  TableCellBackgroundSchema,
  TableCellContentStyleSchema,
} from './schema';

/** Table Cell box 背景 IR */
export type IRTableCellBackground = ZodInfer<typeof TableCellBackgroundSchema>;

/** Table Cell 稀疏背景默认 IR */
export type IRTableCellBackgroundDefaults = ZodInfer<typeof TableCellBackgroundDefaultsSchema>;

/** Table Cell 内容级联默认 IR */
export type IRTableCellContentStyle = ZodInfer<typeof TableCellContentStyleSchema>;

/** Table Cell 最终视觉外观 IR */
export type IRTableCellAppearance = ZodInfer<typeof TableCellAppearanceSchema>;

/** Table Cell 稀疏外观默认 IR */
export type IRTableCellAppearanceDefaults = ZodInfer<typeof TableCellAppearanceDefaultsSchema>;

/** Table 按 Cell location 分组的稀疏外观默认 IR */
export type IRTableAppearanceDefaults = ZodInfer<typeof TableAppearanceDefaultsSchema>;
