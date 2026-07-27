import type { AnyCoordinateDefinition } from '../../../contract';

import { extractCoordinateType } from '../../../contract';
import { CARTESIAN_COORDINATES, POLAR_COORDINATES } from '../features';

/**
 * 内置坐标系的 registry 元数据。
 * @description 这里只收集内置 definition，不直接暴露具体 frame 工厂。lowering 会把它与用户传入的 definition
 *   合并成同一个 registry，因此内置坐标与扩展坐标共享 schema 提取、resolve、capability 消费流程
 */
export const BUILTIN_COORDINATES: ReadonlyArray<AnyCoordinateDefinition> = [
  ...CARTESIAN_COORDINATES,
  ...POLAR_COORDINATES,
];

/**
 * 按 type 索引的内置坐标系元数据。
 * @description 主要供 schema 开放配置识别与 lowering 判断某个 coordinate operation 是否命中内置 definition；
 *   自定义 definition 不写入此表，而是在每次 lowering 时通过 resolveCoordinateRegistry 合并
 */
export const BUILTIN_COORDINATE_DEFINITIONS_BY_TYPE: ReadonlyMap<string, AnyCoordinateDefinition> = new Map(
  BUILTIN_COORDINATES.map(def => [extractCoordinateType(def.schema), def] as const),
);
