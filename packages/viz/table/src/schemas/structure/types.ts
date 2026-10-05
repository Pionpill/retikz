import type { infer as ZodInfer } from 'zod';

import type {
  CustomTableStructureSchema,
  DetailTableStructureSchema,
  ManualTableStructureSchema,
  TableDetailColumnSchema,
  TableStructureSchema,
} from './schema';

/** manual Table structure operation */
export type IRManualTableStructure = ZodInfer<typeof ManualTableStructureSchema>;

/** detail Table column */
export type IRTableDetailColumn = ZodInfer<typeof TableDetailColumnSchema>;

/** detail Table structure operation */
export type IRDetailTableStructure = ZodInfer<typeof DetailTableStructureSchema>;

/** JSON-safe custom Table structure operation */
export type IRCustomTableStructure = ZodInfer<typeof CustomTableStructureSchema>;

/** Table structure operation */
export type IRTableStructureOperation = ZodInfer<typeof TableStructureSchema>;
