import type { AnyTableStructureDefinition } from '../../contract';

import { DETAIL_TABLE_STRUCTURE } from './detail';
import { MANUAL_TABLE_STRUCTURE } from './manual';

/** alpha.1 内置 Table structure definitions */
export const BUILTIN_TABLE_STRUCTURES: ReadonlyArray<AnyTableStructureDefinition> = [
  MANUAL_TABLE_STRUCTURE,
  DETAIL_TABLE_STRUCTURE,
];
