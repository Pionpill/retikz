import { assertNonEmptyString } from '@retikz/foundation';

import type { EntityRoleDefinition, EntityVariantDefinition } from '../../contract';

import { RetikzGraphError, RetikzGraphErrorCode } from '../../errors';
import { BUILTIN_ENTITY_ROLE_DEFINITIONS, BUILTIN_ENTITY_VARIANT_DEFINITIONS } from './definitions';

/** 合并内置与自定义 Entity roles，并拒绝重复 key */
export const resolveEntityRoleRegistry = (
  custom: ReadonlyArray<EntityRoleDefinition> | undefined = undefined,
): ReadonlyMap<string, EntityRoleDefinition> => {
  const registry = new Map<string, EntityRoleDefinition>();
  for (const definition of [...BUILTIN_ENTITY_ROLE_DEFINITIONS, ...(custom ?? [])]) {
    assertNonEmptyString(definition.role, 'Entity role');
    if (registry.has(definition.role)) {
      throw new RetikzGraphError({
        code: RetikzGraphErrorCode.DefinitionDuplicate,
        message: `Entity role '${definition.role}' is already registered.`,
        details: { capability: 'entity-role', key: definition.role },
      });
    }
    registry.set(definition.role, definition);
  }
  return registry;
};

/** 合并内置与自定义 Entity variants，并拒绝重复 key */
export const resolveEntityVariantRegistry = (
  custom: ReadonlyArray<EntityVariantDefinition> | undefined = undefined,
): ReadonlyMap<string, EntityVariantDefinition> => {
  const registry = new Map<string, EntityVariantDefinition>();
  for (const definition of [...BUILTIN_ENTITY_VARIANT_DEFINITIONS, ...(custom ?? [])]) {
    assertNonEmptyString(definition.variant, 'Entity variant');
    if (registry.has(definition.variant)) {
      throw new RetikzGraphError({
        code: RetikzGraphErrorCode.DefinitionDuplicate,
        message: `Entity variant '${definition.variant}' is already registered.`,
        details: { capability: 'entity-variant', key: definition.variant },
      });
    }
    registry.set(definition.variant, definition);
  }
  return registry;
};
