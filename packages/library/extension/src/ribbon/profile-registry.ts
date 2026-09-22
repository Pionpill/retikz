import { assertNonEmptyString } from '@retikz/foundation';

import { RetikzExtensionError, RetikzExtensionErrorCode } from '../errors';
import type { RibbonWidthProfileDefinition } from './profile-types';

/** 合并 Extension Ribbon 内置与调用方 profile，并拒绝同名冲突 */
export const resolveRibbonWidthProfileRegistry = (
  builtins: ReadonlyArray<RibbonWidthProfileDefinition>,
  custom: ReadonlyArray<RibbonWidthProfileDefinition> = [],
): ReadonlyMap<string, RibbonWidthProfileDefinition> => {
  const registry = new Map<string, RibbonWidthProfileDefinition>();
  for (const definition of [...builtins, ...custom]) {
    assertNonEmptyString(
      definition.name,
      'Ribbon width profile name',
      new RetikzExtensionError({
        code: RetikzExtensionErrorCode.AuthoringInvalid,
        message: 'Ribbon width profile name must be a non-empty string.',
        details: { name: definition.name },
      }),
    );
    const previous = registry.get(definition.name);
    if (previous !== undefined && previous !== definition) {
      throw new RetikzExtensionError({
        code: RetikzExtensionErrorCode.RegistryConflict,
        message: `Ribbon width profile '${definition.name}' is defined more than once.`,
        details: { name: definition.name },
      });
    }
    registry.set(definition.name, definition);
  }
  return registry;
};
