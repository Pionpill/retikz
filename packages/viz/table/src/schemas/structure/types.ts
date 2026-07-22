import type { z } from 'zod';

import type { CustomTableStructureSchema } from './custom';
import type { DetailTableStructureSchema, TableDetailColumnSchema } from './detail';
import type { ManualTableStructureSchema } from './manual';
import type { TableStructureSchema } from './schema';

/** manual Table structure operation */
export type IRManualTableStructure = z.infer<typeof ManualTableStructureSchema>;

/** detail Table column */
export type IRTableDetailColumn = z.infer<typeof TableDetailColumnSchema>;

/** detail Table structure operation */
export type IRDetailTableStructure = z.infer<typeof DetailTableStructureSchema>;

/** JSON-safe custom Table structure operation */
export type IRCustomTableStructure = z.infer<typeof CustomTableStructureSchema>;

/** Table structure operation */
export type IRTableStructureOperation = z.infer<typeof TableStructureSchema>;
