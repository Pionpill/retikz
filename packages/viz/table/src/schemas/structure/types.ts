import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type { TableRowKind, TableStructureKind } from './constants';
import type {
  CustomTableStructureSchema,
  DetailTableStructureSchema,
  ManualTableStructureSchema,
  TableDetailColumnSchema,
  TableStructureSchema,
} from './schema';

/** Table structure 判别值 */
export type TableStructureKindValue = ValueOf<typeof TableStructureKind>;

/** canonical Table row 类型取值 */
export type TableRowKindValue = ValueOf<typeof TableRowKind>;

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
