import { assertNonEmptyString } from '@retikz/foundation';

import type { EntityKindDefinition, EntityPredicateDefinition, EntityRoleDefinition } from '../../contract';

import { RetikzGraphError, RetikzGraphErrorCode } from '../../errors';
import { BUILTIN_ENTITY_ROLE_DEFINITIONS } from './definitions';

const duplicateDefinition = (capability: string, key: string): RetikzGraphError =>
  new RetikzGraphError({
    code: RetikzGraphErrorCode.DefinitionDuplicate,
    message: `${capability} '${key}' is already registered.`,
    details: { capability, key },
  });

const missingDefinition = (capability: string, key: string, availableKeys: Iterable<string>): RetikzGraphError =>
  new RetikzGraphError({
    code: RetikzGraphErrorCode.DefinitionNotRegistered,
    message: `${capability} '${key}' is not registered.`,
    details: { capability, key, availableKeys: [...availableKeys] },
  });

/** 合并内置与自定义 Entity roles，并拒绝重复 key */
export const resolveEntityRoleRegistry = (
  custom: ReadonlyArray<EntityRoleDefinition> | undefined = undefined,
): ReadonlyMap<string, EntityRoleDefinition> => {
  const registry = new Map<string, EntityRoleDefinition>();
  for (const definition of [...BUILTIN_ENTITY_ROLE_DEFINITIONS, ...(custom ?? [])]) {
    assertNonEmptyString(definition.role, 'Entity role');
    assertNonEmptyString(definition.description, `Entity role '${definition.role}' description`);
    if (registry.has(definition.role)) throw duplicateDefinition('entity-role', definition.role);
    registry.set(definition.role, definition);
  }
  return registry;
};

/** 合并 Entity kinds，并校验所属 role */
export const resolveEntityKindRegistry = (
  custom: ReadonlyArray<EntityKindDefinition> | undefined,
  roles: ReadonlyMap<string, EntityRoleDefinition>,
): ReadonlyMap<string, EntityKindDefinition> => {
  const registry = new Map<string, EntityKindDefinition>();
  for (const definition of custom ?? []) {
    assertNonEmptyString(definition.kind, 'Entity kind');
    assertNonEmptyString(definition.role, `Entity kind '${definition.kind}' role`);
    assertNonEmptyString(definition.description, `Entity kind '${definition.kind}' description`);
    if (!roles.has(definition.role)) {
      throw missingDefinition(`Entity kind '${definition.kind}' parent role`, definition.role, roles.keys());
    }
    if (registry.has(definition.kind)) throw duplicateDefinition('entity-kind', definition.kind);
    registry.set(definition.kind, definition);
  }
  return registry;
};

/** 合并 Entity predicates，并校验所属 role 与允许 kinds */
export const resolveEntityPredicateRegistry = (
  custom: ReadonlyArray<EntityPredicateDefinition> | undefined,
  roles: ReadonlyMap<string, EntityRoleDefinition>,
  kinds: ReadonlyMap<string, EntityKindDefinition>,
): ReadonlyMap<string, EntityPredicateDefinition> => {
  const registry = new Map<string, EntityPredicateDefinition>();
  for (const definition of custom ?? []) {
    assertNonEmptyString(definition.name, 'Entity predicate');
    assertNonEmptyString(definition.role, `Entity predicate '${definition.name}' role`);
    assertNonEmptyString(definition.description, `Entity predicate '${definition.name}' description`);
    if (!roles.has(definition.role)) {
      throw missingDefinition(`Entity predicate '${definition.name}' parent role`, definition.role, roles.keys());
    }
    const seenKinds = new Set<string>();
    for (const kindKey of definition.kinds ?? []) {
      if (seenKinds.has(kindKey)) throw duplicateDefinition(`Entity predicate '${definition.name}' kind`, kindKey);
      seenKinds.add(kindKey);
      const kind = kinds.get(kindKey);
      if (kind === undefined) {
        throw missingDefinition(`Entity predicate '${definition.name}' kind`, kindKey, kinds.keys());
      }
      if (kind.role !== definition.role) {
        throw new RetikzGraphError({
          code: RetikzGraphErrorCode.DefinitionConflict,
          message: `Entity predicate '${definition.name}' kind '${kindKey}' belongs to role '${kind.role}', not '${definition.role}'.`,
          details: { capability: 'entity-predicate-kind', key: kindKey },
        });
      }
    }
    if (registry.has(definition.name)) throw duplicateDefinition('entity-predicate', definition.name);
    registry.set(definition.name, definition);
  }
  return registry;
};
