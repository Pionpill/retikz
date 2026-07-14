import type { AnyCoordinateDefinition } from '../../contract';

import { extractCoordinateType } from '../../contract';
import { BUILTIN_COORDINATES } from './private';

/** 校验坐标系定位角色可作为稳定、无歧义的 encoding key */
const assertCoordinateRoles = (type: string, roles: ReadonlyArray<string>): void => {
  const seen = new Set<string>();
  for (const role of roles) {
    if (role.trim() === '') {
      throw new Error(`lowerPlots: coordinate "${type}" must declare a non-empty coordinate role`);
    }
    if (seen.has(role)) {
      throw new Error(`lowerPlots: coordinate "${type}" has duplicate coordinate role: "${role}"`);
    }
    seen.add(role);
  }
};

/**
 * 解析坐标系 registry。
 * @description 内置坐标系总是先注册；用户自定义 definition 不能覆盖内置 type，也不能彼此重复。
 *   返回值是一次 lowering 使用的完整 registry，后续通过 coordinate.type 找到 definition，再由该 definition.schema parse
 *   operation，并调用 definition.resolve 得到运行时 frame
 */
export const resolveCoordinateRegistry = (
  custom?: ReadonlyArray<AnyCoordinateDefinition>,
): Map<string, AnyCoordinateDefinition> => {
  const registry = new Map<string, AnyCoordinateDefinition>();
  for (const def of BUILTIN_COORDINATES) {
    const type = extractCoordinateType(def.schema);
    assertCoordinateRoles(type, def.roles);
    registry.set(type, def);
  }
  for (const def of custom ?? []) {
    const type = extractCoordinateType(def.schema);
    assertCoordinateRoles(type, def.roles);
    if (registry.has(type)) {
      throw new Error(`lowerPlots: duplicate coordinate registration: "${type}"`);
    }
    registry.set(type, def);
  }
  return registry;
};
