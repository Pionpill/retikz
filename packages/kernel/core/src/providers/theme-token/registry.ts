import { z } from 'zod';

import type { AnyThemeTokenDefinition } from '../../contract';

import { CoreThemeTokenDefinition } from './core';

const assertDefinition = (definition: AnyThemeTokenDefinition, source: string): void => {
  if (typeof definition !== 'object') {
    throw new Error(`Theme token definition from ${source} must be an object.`);
  }
  if (!Object.isFrozen(definition)) {
    throw new Error(`Theme token definition "${definition.namespace}" from ${source} must be frozen.`);
  }
  if (typeof definition.namespace !== 'string' || definition.namespace.trim().length === 0) {
    throw new Error(`Theme token definition from ${source} must declare a non-empty namespace.`);
  }
  if (!(definition.schema instanceof z.ZodType)) {
    throw new Error(`Theme token definition "${definition.namespace}" from ${source} must provide a Zod schema.`);
  }
};

/** 按 Core built-in 优先、输入顺序构建 Theme token definition registry */
export const resolveThemeTokenRegistry = (
  definitions: ReadonlyArray<AnyThemeTokenDefinition> = [],
): ReadonlyMap<string, AnyThemeTokenDefinition> => {
  const registry = new Map<string, AnyThemeTokenDefinition>();
  const sources = new Map<string, string>();

  const register = (definition: AnyThemeTokenDefinition, source: string): void => {
    assertDefinition(definition, source);
    const first = registry.get(definition.namespace);
    if (first === undefined) {
      registry.set(definition.namespace, definition);
      sources.set(definition.namespace, source);
      return;
    }
    if (first === definition) return;
    throw new Error(
      `Theme token namespace "${definition.namespace}" conflict: first definition from ${sources.get(
        definition.namespace,
      )}; conflicting definition from ${source}.`,
    );
  };

  register(CoreThemeTokenDefinition, 'Core built-in');
  definitions.forEach((definition, index) => register(definition, `themeTokenDefinitions[${index}]`));

  return registry;
};
