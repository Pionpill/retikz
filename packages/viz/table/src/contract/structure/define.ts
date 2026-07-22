import type { IRTableStructureOperation } from '../../schemas';
import type { TableStructureDefinition } from './types';

/** 定义 Table structure provider 并保留 operation 泛型 */
export const defineTableStructure = <TSpec extends IRTableStructureOperation>(
  definition: TableStructureDefinition<TSpec>,
): TableStructureDefinition<TSpec> => definition;
