import type { EntityPredicateDefinition } from '../../contract';
import type {
  IRGraphEntity,
  IRGraphEntityAppearanceTokenOverrides,
  IRGraphEntityThemeRule,
  IRGraphThemeLayer,
} from '../../schemas';
import type {
  CanonicalEntity,
  CanonicalEntityPredicate,
  EffectiveEntityAppearance,
  EntityAppearanceResolveContext,
  EntityResolveContext,
} from './types';

import { RetikzGraphError, RetikzGraphErrorCode } from '../../errors';
import { matchesGraphThemeSelector, resolveGraphTheme, validateGraphThemeSelector } from '../theme';

const requiredDefinition = <T>(registry: ReadonlyMap<string, T>, key: string, capability: string): T => {
  const definition = registry.get(key);
  if (definition !== undefined) return definition;
  throw new RetikzGraphError({
    code: RetikzGraphErrorCode.DefinitionNotRegistered,
    message: `${capability} '${key}' is not registered.`,
    details: { capability, key, availableKeys: [...registry.keys()] },
  });
};

const resolvePredicate = (source: IRGraphEntity, definition: EntityPredicateDefinition): CanonicalEntityPredicate => {
  try {
    return {
      definition,
      params: definition.paramsSchema.parse(source.predicate?.params ?? {}),
    };
  } catch (cause) {
    throw new RetikzGraphError({
      code: RetikzGraphErrorCode.ResolveInvalid,
      message: `Entity '${source.id}' predicate '${definition.name}' params are invalid.`,
      details: { capability: 'entity-predicate', key: definition.name, nodeId: source.id },
      cause,
    });
  }
};

/** 把 Source Entity 与 definitions 确定为 Canonical Entity */
export const resolveEntity = (source: IRGraphEntity, context: EntityResolveContext): CanonicalEntity => {
  const roleDefinition = requiredDefinition(context.entityRoles, source.role, `Entity '${source.id}' role`);
  const kindDefinition =
    source.kind === undefined
      ? undefined
      : requiredDefinition(context.entityKinds, source.kind, `Entity '${source.id}' kind`);
  if (kindDefinition !== undefined && kindDefinition.role !== source.role) {
    throw new RetikzGraphError({
      code: RetikzGraphErrorCode.ResolveInvalid,
      message: `Entity '${source.id}' kind '${source.kind}' belongs to role '${kindDefinition.role}', not '${source.role}'.`,
      details: { capability: 'entity-kind', key: source.kind, nodeId: source.id },
    });
  }
  const predicateDefinition =
    source.predicate === undefined
      ? undefined
      : requiredDefinition(context.entityPredicates, source.predicate.name, `Entity '${source.id}' predicate`);
  if (predicateDefinition !== undefined) {
    const kindAllowed =
      predicateDefinition.kinds === undefined ||
      predicateDefinition.kinds.length === 0 ||
      (source.kind !== undefined && predicateDefinition.kinds.includes(source.kind));
    if (predicateDefinition.role !== source.role || !kindAllowed) {
      throw new RetikzGraphError({
        code: RetikzGraphErrorCode.ResolveInvalid,
        message: `Entity '${source.id}' predicate '${predicateDefinition.name}' does not allow role '${source.role}' and kind '${source.kind ?? ''}'.`,
        details: { capability: 'entity-predicate', key: predicateDefinition.name, nodeId: source.id },
      });
    }
  }
  return {
    source,
    roleDefinition,
    kindDefinition,
    ...(predicateDefinition === undefined ? {} : { predicate: resolvePredicate(source, predicateDefinition) }),
  };
};

const mergeMatchingRules = (
  appearance: EffectiveEntityAppearance,
  rules: ReadonlyArray<IRGraphEntityThemeRule>,
  subject: Parameters<typeof matchesGraphThemeSelector>[1],
): EffectiveEntityAppearance =>
  rules.reduce<EffectiveEntityAppearance>(
    (current, rule) =>
      matchesGraphThemeSelector(rule.selector, subject) ? { ...current, ...rule.appearance } : current,
    appearance,
  );

type EntityGraphThemeOverrideContext = EntityResolveContext &
  Readonly<{
    layers: ReadonlyArray<IRGraphThemeLayer>;
  }>;

/** 只投影 Graph-local layer 对当前 Entity 的稀疏 appearance，不解析 Core Theme baseline */
export const resolveEntityGraphThemeOverrides = (
  entity: CanonicalEntity,
  context: EntityGraphThemeOverrideContext,
): IRGraphEntityAppearanceTokenOverrides => {
  const selectorContext = {
    member: 'Entity' as const,
    roles: context.entityRoles,
    kinds: context.entityKinds,
    predicates: context.entityPredicates,
  };
  const rules = context.layers.flatMap(layer =>
    layer.rules.filter((rule): rule is IRGraphEntityThemeRule => rule.type === 'entity'),
  );
  for (const rule of rules) validateGraphThemeSelector(rule.selector, selectorContext);
  const subject = {
    role: entity.source.role,
    ...(entity.source.kind === undefined ? {} : { kind: entity.source.kind }),
    ...(entity.predicate === undefined
      ? {}
      : { predicate: { name: entity.predicate.definition.name, params: entity.predicate.params } }),
  };
  return rules.reduce<IRGraphEntityAppearanceTokenOverrides>(
    (current, rule) =>
      matchesGraphThemeSelector(rule.selector, subject) ? { ...current, ...rule.appearance } : current,
    {},
  );
};

/** 把 Canonical Entity 与当前位置 Theme rules 确定为唯一有效外观 */
export const resolveEntityAppearance = (
  entity: CanonicalEntity,
  context: EntityAppearanceResolveContext,
): EffectiveEntityAppearance => {
  const graphTheme = resolveGraphTheme(context.theme, context.graphThemeStyles);
  const selectorContext = {
    member: 'Entity' as const,
    roles: context.entityRoles,
    kinds: context.entityKinds,
    predicates: context.entityPredicates,
  };
  const styleRules = graphTheme.entity.rules ?? [];
  const layerRules = (context.layers ?? []).flatMap(layer =>
    layer.rules.filter((rule): rule is IRGraphEntityThemeRule => rule.type === 'entity'),
  );
  for (const rule of [...styleRules, ...layerRules]) validateGraphThemeSelector(rule.selector, selectorContext);
  const subject = {
    role: entity.source.role,
    ...(entity.source.kind === undefined ? {} : { kind: entity.source.kind }),
    ...(entity.predicate === undefined
      ? {}
      : { predicate: { name: entity.predicate.definition.name, params: entity.predicate.params } }),
  };
  const styled = mergeMatchingRules(graphTheme.entity.tokens, styleRules, subject);
  return mergeMatchingRules(styled, layerRules, subject);
};
