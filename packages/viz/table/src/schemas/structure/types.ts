import type { infer as ZodInfer } from 'zod';

import type {
  CustomTableStructureSchema,
  DetailTableStructureSchema,
  ManualTableStructureSchema,
  TableDetailColumnSchema,
  TableStructureSchema,
} from './schema';

/** 显式编写表格结构的操作 */
export type IRManualTableStructure = ZodInfer<typeof ManualTableStructureSchema>;

/** 明细表格的列描述 */
export type IRTableDetailColumn = ZodInfer<typeof TableDetailColumnSchema>;

/** 生成明细表格结构的操作 */
export type IRDetailTableStructure = ZodInfer<typeof DetailTableStructureSchema>;

/** 可 JSON 序列化的自定义表格结构操作 */
export type IRCustomTableStructure = ZodInfer<typeof CustomTableStructureSchema>;

/** 表格结构生成操作 */
export type IRTableStructureOperation = ZodInfer<typeof TableStructureSchema>;
