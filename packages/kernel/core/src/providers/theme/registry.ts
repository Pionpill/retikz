import type { ThemeDefinition } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';

/** 合并内置与自定义 Themes 并拒绝同名定义 */
export const resolveThemeRegistry = (
  custom: ReadonlyArray<ThemeDefinition> | undefined = undefined,
): ReadonlyMap<string, ThemeDefinition> => {
  const registry = new Map<string, ThemeDefinition>();

  for (const definition of custom ?? []) {
    if (registry.has(definition.name)) {
      throw new RetikzCoreError(RetikzCoreErrorCode.Provider, `Theme '${definition.name}' is already registered.`);
    }

    registry.set(definition.name, definition);
  }

  return registry;
};
