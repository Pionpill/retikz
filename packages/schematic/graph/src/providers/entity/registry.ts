import { assertNonEmptyString } from '@retikz/foundation';

import type { EntityKindDefinition, EntityPredicateDefinition, EntityRoleDefinition } from '../../contract';

import { RetikzGraphError, RetikzGraphErrorCode } from '../../errors';
import { BUILTIN_ENTITY_ROLE_DEFINITIONS } from './definitions';

/** 按 role 分组的 Entity kind definitions */
export type EntityKindRegistry = ReadonlyMap<string, ReadonlyMap<string, EntityKindDefinition>>;

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

const invalidDefinition = (label: string, value: string): RetikzGraphError =>
  new RetikzGraphError({
    code: RetikzGraphErrorCode.DefinitionConflict,
    message: `${label} must be a non-empty string.`,
    details: { capability: 'entity-registry', key: value, reason: `${label} must be a non-empty string.` },
  });

/** 读取一个 role 内注册的 Entity kind definition */
export const entityKindDefinitionOf = (
  registry: EntityKindRegistry,
  role: string,
  kind: string,
): EntityKindDefinition | undefined => registry.get(role)?.get(kind);

/** 收集在任一 role 注册过的 Entity kind key，供 Theme selector 校验 */
export const entityKindKeys = (registry: EntityKindRegistry): ReadonlySet<string> => {
  const keys = new Set<string>();
  for (const kinds of registry.values()) {
    for (const kind of kinds.keys()) keys.add(kind);
  }
  return keys;
};

/** 合并内置与自定义 Entity roles，并拒绝重复 key */
export const resolveEntityRoleRegistry = (
  custom: ReadonlyArray<EntityRoleDefinition> | undefined = undefined,
): ReadonlyMap<string, EntityRoleDefinition> => {
  const registry = new Map<string, EntityRoleDefinition>();
  for (const definition of [...BUILTIN_ENTITY_ROLE_DEFINITIONS, ...(custom ?? [])]) {
    assertNonEmptyString(definition.role, 'Entity role', invalidDefinition('Entity role', definition.role));
    assertNonEmptyString(
      definition.description,
      `Entity role '${definition.role}' description`,
      invalidDefinition(`Entity role '${definition.role}' description`, definition.description),
    );
    if (registry.has(definition.role)) throw duplicateDefinition('entity-role', definition.role);
    registry.set(definition.role, definition);
  }
  return registry;
};

/** 合并 Entity kinds，并以 role 与 kind 的组合身份校验重复注册 */
export const resolveEntityKindRegistry = (
  custom: ReadonlyArray<EntityKindDefinition> | undefined,
  roles: ReadonlyMap<string, EntityRoleDefinition>,
): EntityKindRegistry => {
  const registry = new Map<string, Map<string, EntityKindDefinition>>();
  for (const definition of custom ?? []) {
    assertNonEmptyString(definition.kind, 'Entity kind', invalidDefinition('Entity kind', definition.kind));
    assertNonEmptyString(
      definition.role,
      `Entity kind '${definition.kind}' role`,
      invalidDefinition(`Entity kind '${definition.kind}' role`, definition.role),
    );
    assertNonEmptyString(
      definition.description,
      `Entity kind '${definition.kind}' description`,
      invalidDefinition(`Entity kind '${definition.kind}' description`, definition.description),
    );
    if (!roles.has(definition.role)) {
      throw missingDefinition(`Entity kind '${definition.kind}' parent role`, definition.role, roles.keys());
    }
    const kinds = registry.get(definition.role) ?? new Map<string, EntityKindDefinition>();
    if (kinds.has(definition.kind)) {
      throw new RetikzGraphError({
        code: RetikzGraphErrorCode.DefinitionDuplicate,
        message: `Entity kind '${definition.kind}' is already registered for role '${definition.role}'.`,
        details: { capability: 'entity-kind', key: definition.kind, reason: `role '${definition.role}'` },
      });
    }
    kinds.set(definition.kind, definition);
    registry.set(definition.role, kinds);
  }
  return registry;
};

/** 合并 Entity predicates，并校验所属 role 与允许 kinds */
export const resolveEntityPredicateRegistry = (
  custom: ReadonlyArray<EntityPredicateDefinition> | undefined,
  roles: ReadonlyMap<string, EntityRoleDefinition>,
  kinds: EntityKindRegistry,
): ReadonlyMap<string, EntityPredicateDefinition> => {
  const registry = new Map<string, EntityPredicateDefinition>();
  for (const definition of custom ?? []) {
    assertNonEmptyString(definition.name, 'Entity predicate', invalidDefinition('Entity predicate', definition.name));
    assertNonEmptyString(
      definition.role,
      `Entity predicate '${definition.name}' role`,
      invalidDefinition(`Entity predicate '${definition.name}' role`, definition.role),
    );
    assertNonEmptyString(
      definition.description,
      `Entity predicate '${definition.name}' description`,
      invalidDefinition(`Entity predicate '${definition.name}' description`, definition.description),
    );
    if (!roles.has(definition.role)) {
      throw missingDefinition(`Entity predicate '${definition.name}' parent role`, definition.role, roles.keys());
    }
    const seenKinds = new Set<string>();
    for (const kindKey of definition.kinds ?? []) {
      if (seenKinds.has(kindKey)) throw duplicateDefinition(`Entity predicate '${definition.name}' kind`, kindKey);
      seenKinds.add(kindKey);
      const kind = entityKindDefinitionOf(kinds, definition.role, kindKey);
      if (kind === undefined) {
        throw missingDefinition(
          `Entity predicate '${definition.name}' kind`,
          kindKey,
          kinds.get(definition.role)?.keys() ?? [],
        );
      }
    }
    if (registry.has(definition.name)) throw duplicateDefinition('entity-predicate', definition.name);
    registry.set(definition.name, definition);
  }
  return registry;
};
