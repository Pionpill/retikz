import { RetikzExtensionError, RetikzExtensionErrorCode } from '../errors';
import { defineRibbonCap } from './cap-define';
import type { RibbonCapDefinition } from './cap-types';

/** 合并端帽定义并拒绝同名覆盖 */
export const resolveRibbonCapRegistry = (
  builtins: ReadonlyArray<RibbonCapDefinition>,
  custom: ReadonlyArray<RibbonCapDefinition> = [],
): ReadonlyMap<string, RibbonCapDefinition> => {
  const registry = new Map<string, RibbonCapDefinition>();

  for (const definition of [...builtins, ...custom]) {
    defineRibbonCap(definition);
    if (registry.has(definition.name))
      throw new RetikzExtensionError({
        code: RetikzExtensionErrorCode.RegistryConflict,
        message: `Ribbon cap '${definition.name}' is defined more than once.`,
        details: { name: definition.name },
      });

    registry.set(definition.name, definition);
  }

  return registry;
};
