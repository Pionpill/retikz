import { assertNonEmptyString } from '@retikz/foundation';

import type { RelationKindDefinition, RelationPredicateDefinition, RelationRoleDefinition } from '../../contract';
import type { RelationDirectionValue } from '../../schemas';

import { RetikzGraphError, RetikzGraphErrorCode } from '../../errors';
import { BUILTIN_RELATION_KIND_DEFINITIONS, BUILTIN_RELATION_ROLE_DEFINITIONS } from './definitions';

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

const conflictingDefinition = (capability: string, key: string, reason: string): RetikzGraphError =>
  new RetikzGraphError({
    code: RetikzGraphErrorCode.DefinitionConflict,
    message: `${capability} '${key}' ${reason}`,
    details: { capability, key, reason },
  });

const uniqueDirections = (
  capability: string,
  key: string,
  directions: ReadonlyArray<RelationDirectionValue>,
): ReadonlySet<RelationDirectionValue> => {
  if (directions.length === 0) throw conflictingDefinition(capability, key, 'requires at least one direction.');
  const unique = new Set(directions);
  if (unique.size !== directions.length) throw duplicateDefinition(`${capability} direction`, key);
  return unique;
};

/** 合并内置与自定义 Relation roles，并校验完整方向 recipe */
export const resolveRelationRoleRegistry = (
  custom: ReadonlyArray<RelationRoleDefinition> | undefined = undefined,
): ReadonlyMap<string, RelationRoleDefinition> => {
  const registry = new Map<string, RelationRoleDefinition>();
  for (const definition of [...BUILTIN_RELATION_ROLE_DEFINITIONS, ...(custom ?? [])]) {
    assertNonEmptyString(definition.role, 'Relation role');
    assertNonEmptyString(definition.description, `Relation role '${definition.role}' description`);
    if (registry.has(definition.role)) throw duplicateDefinition('relation-role', definition.role);
    const allowed = uniqueDirections('Relation role', definition.role, definition.allowedDirections);
    if (!allowed.has(definition.defaultDirection)) {
      throw conflictingDefinition(
        'Relation role',
        definition.role,
        `default direction '${definition.defaultDirection}' is not allowed.`,
      );
    }
    for (const direction of allowed) {
      if (definition.directions[direction] === undefined) {
        throw conflictingDefinition('Relation role', definition.role, `does not define direction '${direction}'.`);
      }
    }
    for (const direction of Object.keys(definition.directions) as Array<RelationDirectionValue>) {
      if (!allowed.has(direction)) {
        throw conflictingDefinition('Relation role', definition.role, `defines unsupported direction '${direction}'.`);
      }
    }
    registry.set(definition.role, definition);
  }
  return registry;
};

/** 合并内置与自定义 Relation kinds，并校验 role 与方向收窄 */
export const resolveRelationKindRegistry = (
  custom: ReadonlyArray<RelationKindDefinition> | undefined,
  roles: ReadonlyMap<string, RelationRoleDefinition>,
): ReadonlyMap<string, RelationKindDefinition> => {
  const registry = new Map<string, RelationKindDefinition>();
  for (const definition of [...BUILTIN_RELATION_KIND_DEFINITIONS, ...(custom ?? [])]) {
    assertNonEmptyString(definition.kind, 'Relation kind');
    assertNonEmptyString(definition.role, `Relation kind '${definition.kind}' role`);
    assertNonEmptyString(definition.description, `Relation kind '${definition.kind}' description`);
    if (registry.has(definition.kind)) throw duplicateDefinition('relation-kind', definition.kind);
    const role = roles.get(definition.role);
    if (role === undefined) {
      throw missingDefinition(`Relation kind '${definition.kind}' parent role`, definition.role, roles.keys());
    }
    const roleAllowed = new Set(role.allowedDirections);
    const effectiveAllowed = definition.allowedDirections ?? role.allowedDirections;
    const allowed = uniqueDirections('Relation kind', definition.kind, effectiveAllowed);
    for (const direction of allowed) {
      if (!roleAllowed.has(direction)) {
        throw conflictingDefinition(
          'Relation kind',
          definition.kind,
          `direction '${direction}' is not allowed by role '${definition.role}'.`,
        );
      }
    }
    const defaultDirection = definition.defaultDirection ?? role.defaultDirection;
    if (!allowed.has(defaultDirection)) {
      throw conflictingDefinition(
        'Relation kind',
        definition.kind,
        `default direction '${defaultDirection}' is not allowed.`,
      );
    }
    for (const direction of Object.keys(definition.directions ?? {}) as Array<RelationDirectionValue>) {
      if (!allowed.has(direction)) {
        throw conflictingDefinition('Relation kind', definition.kind, `defines unsupported direction '${direction}'.`);
      }
    }
    registry.set(definition.kind, definition);
  }
  return registry;
};

/** 合并 Relation predicates，并校验所属 role 与允许 kinds */
export const resolveRelationPredicateRegistry = (
  custom: ReadonlyArray<RelationPredicateDefinition> | undefined,
  roles: ReadonlyMap<string, RelationRoleDefinition>,
  kinds: ReadonlyMap<string, RelationKindDefinition>,
): ReadonlyMap<string, RelationPredicateDefinition> => {
  const registry = new Map<string, RelationPredicateDefinition>();
  for (const definition of custom ?? []) {
    assertNonEmptyString(definition.name, 'Relation predicate');
    assertNonEmptyString(definition.role, `Relation predicate '${definition.name}' role`);
    assertNonEmptyString(definition.description, `Relation predicate '${definition.name}' description`);
    if (registry.has(definition.name)) throw duplicateDefinition('relation-predicate', definition.name);
    if (!roles.has(definition.role)) {
      throw missingDefinition(`Relation predicate '${definition.name}' parent role`, definition.role, roles.keys());
    }
    const seenKinds = new Set<string>();
    for (const kindKey of definition.kinds ?? []) {
      if (seenKinds.has(kindKey)) throw duplicateDefinition(`Relation predicate '${definition.name}' kind`, kindKey);
      seenKinds.add(kindKey);
      const kind = kinds.get(kindKey);
      if (kind === undefined) {
        throw missingDefinition(`Relation predicate '${definition.name}' kind`, kindKey, kinds.keys());
      }
      if (kind.role !== definition.role) {
        throw conflictingDefinition(
          `Relation predicate '${definition.name}' kind`,
          kindKey,
          `belongs to role '${kind.role}', not '${definition.role}'.`,
        );
      }
    }
    registry.set(definition.name, definition);
  }
  return registry;
};
