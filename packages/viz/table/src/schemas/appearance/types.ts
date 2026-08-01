import type { z } from 'zod';

import type { TableCellAppearanceSchema, TableCellBackgroundSchema, TableCellContentStyleSchema } from './schema';

/** Table Cell box 背景 IR */
export type IRTableCellBackground = z.infer<typeof TableCellBackgroundSchema>;

/** Table Cell 内容级联默认 IR */
export type IRTableCellContentStyle = z.infer<typeof TableCellContentStyleSchema>;

/** Table Cell 最终视觉外观 IR */
export type IRTableCellAppearance = z.infer<typeof TableCellAppearanceSchema>;
