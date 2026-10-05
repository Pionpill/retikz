import type { IRTableStructureOperation } from '../../schemas';
import type { TableStructureDefinition } from './types';

/**
 * 定义 Table structure provider 并保留 operation 泛型
 * @template TStructure 结构 schema 解析后的精确操作类型，决定 build 接收的结构字段
 */
export const defineTableStructure = <TStructure extends IRTableStructureOperation>(
  definition: TableStructureDefinition<TStructure>,
): TableStructureDefinition<TStructure> => definition;
