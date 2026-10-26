import type { AnyCoordinateDefinition } from '../../../contract';
import { CARTESIAN_COORDINATES, POLAR_COORDINATES } from '../features';

/**
 * 内置坐标系的 registry 元数据
 * @description 这里只收集内置 definition，不直接暴露具体 frame 工厂。lowering 会把它与用户传入的 definition
 *   合并成同一个 registry，因此内置坐标与扩展坐标共享 schema 提取、resolve、capability 消费流程
 */
export const BUILTIN_COORDINATES: ReadonlyArray<AnyCoordinateDefinition> = [
  ...CARTESIAN_COORDINATES,
  ...POLAR_COORDINATES,
];
