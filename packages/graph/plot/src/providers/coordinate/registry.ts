import type { AnyCoordinateDefinition } from '../../contract';

import { extractCoordinateType } from '../../contract';
import { BUILTIN_COORDINATES } from './private';

/**
 * 解析坐标系 registry。
 * @description 内置坐标系总是先注册；用户自定义 definition 不能覆盖内置 type，也不能彼此重复。
 *   返回值是一次 lowering 使用的完整 registry，后续通过 coordinate.type 找到 definition，再由该 definition.schema parse
 *   operation，并调用 definition.resolve 得到运行时 frame。
 */
export const resolveCoordinateRegistry = (
  custom?: ReadonlyArray<AnyCoordinateDefinition>,
): Map<string, AnyCoordinateDefinition> => {
  const registry = new Map<string, AnyCoordinateDefinition>();
  for (const def of BUILTIN_COORDINATES) {
    registry.set(extractCoordinateType(def.schema), def);
  }
  for (const def of custom ?? []) {
    const type = extractCoordinateType(def.schema);
    if (registry.has(type)) {
      throw new Error(`lowerPlots: duplicate coordinate registration: "${type}"`);
    }
    registry.set(type, def);
  }
  return registry;
};
