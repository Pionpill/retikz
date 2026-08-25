import type { infer as ZodInfer } from 'zod';

import type { TableCellAppearanceSchema, TableCellBackgroundSchema, TableCellContentStyleSchema } from './schema';

/** Table Cell box 背景 IR */
export type IRTableCellBackground = ZodInfer<typeof TableCellBackgroundSchema>;

/** Table Cell 内容级联默认 IR */
export type IRTableCellContentStyle = ZodInfer<typeof TableCellContentStyleSchema>;

/** Table Cell 最终视觉外观 IR */
export type IRTableCellAppearance = ZodInfer<typeof TableCellAppearanceSchema>;
