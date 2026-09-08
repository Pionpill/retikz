import type { EntityPredicateDefinition } from '../../contract';
import type { IRGraphEntity, IRGraphEntityDefaults, IRGraphEntityRule } from '../../schemas';
import type {
  CanonicalEntity,
  CanonicalEntityPredicate,
  EffectiveEntityAppearance,
  EntityAppearanceResolveContext,
  EntityGraphLayerResolveContext,
  EntityResolveContext,
} from './types';

import { RetikzGraphError, RetikzGraphErrorCode } from '../../errors';
import { mergeGraphDefaults } from '../theme';
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

const mergeEntityAppearance = (
  current: EffectiveEntityAppearance | undefined,
  override: IRGraphEntityDefaults | undefined,
): EffectiveEntityAppearance =>
  mergeGraphDefaults(
    current === undefined ? undefined : { entity: current },
    override === undefined ? undefined : { entity: override },
  )?.entity ?? {};

const sourceAppearanceOf = (source: IRGraphEntity): IRGraphEntityDefaults => ({
  ...(source.style === undefined ? {} : { style: source.style }),
  ...(source.layout === undefined ? {} : { layout: source.layout }),
});

const selectorContextOf = (context: EntityResolveContext) => ({
  member: 'Entity' as const,
  roles: context.entityRoles,
  kinds: context.entityKinds,
  predicates: context.entityPredicates,
});

const entitySubjectOf = (entity: CanonicalEntity) => ({
  role: entity.source.role,
  ...(entity.source.kind === undefined ? {} : { kind: entity.source.kind }),
  ...(entity.source.status === undefined ? {} : { status: entity.source.status }),
  ...(entity.predicate === undefined
    ? {}
    : { predicate: { name: entity.predicate.definition.name, params: entity.predicate.params } }),
});

const matchingEntityRule = (
  rule: IRGraphEntityRule,
  subject: Parameters<typeof matchesGraphThemeSelector>[1],
): EffectiveEntityAppearance =>
  rule.style === undefined || !matchesGraphThemeSelector(rule.selector, subject) ? {} : { style: rule.style };

const resolveEntityAuthorAppearance = (
  entity: CanonicalEntity,
  context: EntityGraphLayerResolveContext,
): EffectiveEntityAppearance => {
  const selectorContext = selectorContextOf(context);
  const subject = entitySubjectOf(entity);
  let appearance: EffectiveEntityAppearance = {};
  for (const layer of context.layers) {
    appearance = mergeEntityAppearance(appearance, layer.defaults?.entity);
    for (const rule of layer.rules ?? []) {
      if (rule.type !== 'entity') continue;
      validateGraphThemeSelector(rule.selector, selectorContext);
      appearance = mergeEntityAppearance(appearance, matchingEntityRule(rule, subject));
    }
  }
  return appearance;
};

/** 把作者 Graph defaults/rules 按层投影到 Entity Source */
export const projectEntityGraphLayers = (
  entity: CanonicalEntity,
  context: EntityGraphLayerResolveContext,
): IRGraphEntity => {
  const authorAppearance = resolveEntityAuthorAppearance(entity, context);
  if (Object.keys(authorAppearance).length === 0) return entity.source;
  const projected = mergeEntityAppearance(authorAppearance, sourceAppearanceOf(entity.source));
  return {
    ...entity.source,
    ...(projected.style === undefined ? {} : { style: projected.style }),
    ...(projected.layout === undefined ? {} : { layout: projected.layout }),
  };
};

/** 把 Canonical Entity 与当前 Core Theme rules 确定为有效外观 */
export const resolveEntityAppearance = (
  entity: CanonicalEntity,
  context: EntityAppearanceResolveContext,
): EffectiveEntityAppearance => {
  const graphTheme = resolveGraphTheme(context.theme, context.graphThemeStyles);
  const selectorContext = selectorContextOf(context);
  const subject = entitySubjectOf(entity);
  let appearance: EffectiveEntityAppearance = graphTheme.defaults.entity ?? {};
  for (const rule of graphTheme.rules) {
    if (rule.type !== 'entity') continue;
    validateGraphThemeSelector(rule.selector, selectorContext);
    appearance = mergeEntityAppearance(appearance, matchingEntityRule(rule, subject));
  }
  return mergeEntityAppearance(appearance, sourceAppearanceOf(entity.source));
};
