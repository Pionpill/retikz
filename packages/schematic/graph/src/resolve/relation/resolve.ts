import type { RelationPredicateDefinition } from '../../contract';
import type {
  IRGraphRelation,
  IRGraphRelationAppearanceTokenOverrides,
  IRGraphRelationStructureTokenOverrides,
  IRGraphRelationThemeRule,
  IRGraphThemeLayer,
} from '../../schemas';
import type {
  CanonicalRelation,
  CanonicalRelationPredicate,
  EffectiveRelationAppearance,
  EffectiveRelationStructure,
  RelationAppearanceResolveContext,
  RelationResolveContext,
} from './types';

import { RetikzGraphError, RetikzGraphErrorCode } from '../../errors';
import { GraphRelationStructureTokenOverridesSchema } from '../../schemas';
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

const resolvePredicate = (
  source: IRGraphRelation,
  definition: RelationPredicateDefinition,
): CanonicalRelationPredicate => {
  try {
    return {
      definition,
      params: definition.paramsSchema.parse(source.predicate?.params ?? {}),
    };
  } catch (cause) {
    throw new RetikzGraphError({
      code: RetikzGraphErrorCode.ResolveInvalid,
      message: `Relation '${source.id}' predicate '${definition.name}' params are invalid.`,
      details: { capability: 'relation-predicate', key: definition.name, nodeId: source.id },
      cause,
    });
  }
};

/** 把 Source Relation 与 definitions 确定为 Canonical Relation */
export const resolveRelation = (source: IRGraphRelation, context: RelationResolveContext): CanonicalRelation => {
  const roleDefinition = requiredDefinition(context.relationRoles, source.role, `Relation '${source.id}' role`);
  const kindDefinition =
    source.kind === undefined
      ? undefined
      : requiredDefinition(context.relationKinds, source.kind, `Relation '${source.id}' kind`);
  if (kindDefinition !== undefined && kindDefinition.role !== source.role) {
    throw new RetikzGraphError({
      code: RetikzGraphErrorCode.ResolveInvalid,
      message: `Relation '${source.id}' kind '${source.kind}' belongs to role '${kindDefinition.role}', not '${source.role}'.`,
      details: { capability: 'relation-kind', key: source.kind, nodeId: source.id },
    });
  }
  const predicateDefinition =
    source.predicate === undefined
      ? undefined
      : requiredDefinition(context.relationPredicates, source.predicate.name, `Relation '${source.id}' predicate`);
  if (predicateDefinition !== undefined) {
    const kindAllowed =
      predicateDefinition.kinds === undefined ||
      predicateDefinition.kinds.length === 0 ||
      (source.kind !== undefined && predicateDefinition.kinds.includes(source.kind));
    if (predicateDefinition.role !== source.role || !kindAllowed) {
      throw new RetikzGraphError({
        code: RetikzGraphErrorCode.ResolveInvalid,
        message: `Relation '${source.id}' predicate '${predicateDefinition.name}' does not allow role '${source.role}' and kind '${source.kind ?? ''}'.`,
        details: { capability: 'relation-predicate', key: predicateDefinition.name, nodeId: source.id },
      });
    }
  }
  const allowedDirections = kindDefinition?.allowedDirections ?? roleDefinition.allowedDirections;
  const effectiveDirection = source.direction ?? kindDefinition?.defaultDirection ?? roleDefinition.defaultDirection;
  if (!allowedDirections.includes(effectiveDirection)) {
    throw new RetikzGraphError({
      code: RetikzGraphErrorCode.ResolveInvalid,
      message: `Relation '${source.id}' direction '${effectiveDirection}' is not allowed by its role and kind.`,
      details: { capability: 'relation-direction', key: effectiveDirection, nodeId: source.id },
    });
  }
  return {
    source,
    roleDefinition,
    kindDefinition,
    ...(predicateDefinition === undefined ? {} : { predicate: resolvePredicate(source, predicateDefinition) }),
    effectiveDirection,
  };
};

const applyStructure = (
  structure: EffectiveRelationStructure,
  override: IRGraphRelationStructureTokenOverrides | undefined,
): EffectiveRelationStructure => ({
  sourceMarker: override?.sourceMarker ?? structure.sourceMarker,
  targetMarker: override?.targetMarker ?? structure.targetMarker,
  dashPattern: override?.dashPattern ?? structure.dashPattern,
});

const resolvePredicateStructure = (relation: CanonicalRelation): IRGraphRelationStructureTokenOverrides | undefined => {
  const predicate = relation.predicate;
  const callback = predicate?.definition.resolveStructure;
  if (predicate === undefined || callback === undefined) return undefined;
  try {
    return GraphRelationStructureTokenOverridesSchema.parse(callback(predicate.params));
  } catch (cause) {
    throw new RetikzGraphError({
      code: RetikzGraphErrorCode.DefinitionCallbackFailed,
      message: `relation-predicate '${predicate.definition.name}' structure resolution failed.`,
      details: { capability: 'relation-predicate', key: predicate.definition.name },
      cause,
    });
  }
};

/** 按 role、kind、predicate 顺序解析 Relation 的完整结构 */
export const resolveRelationStructure = (relation: CanonicalRelation): EffectiveRelationStructure => {
  const roleStructure = relation.roleDefinition.directions[relation.effectiveDirection];
  if (roleStructure === undefined) {
    throw new RetikzGraphError({
      code: RetikzGraphErrorCode.ResolveInvalid,
      message: `Relation '${relation.source.id}' role has no structure for direction '${relation.effectiveDirection}'.`,
      details: { capability: 'relation-role-structure', key: relation.effectiveDirection, nodeId: relation.source.id },
    });
  }
  const kindStructure = relation.kindDefinition?.directions?.[relation.effectiveDirection];
  return applyStructure(applyStructure(roleStructure, kindStructure), resolvePredicateStructure(relation));
};

const mergeMarkerAppearance = (
  current: IRGraphRelationAppearanceTokenOverrides['sourceMarker'],
  override: IRGraphRelationAppearanceTokenOverrides['sourceMarker'],
): IRGraphRelationAppearanceTokenOverrides['sourceMarker'] =>
  current === undefined && override === undefined ? undefined : { ...current, ...override };

const mergeAppearance = (
  current: EffectiveRelationAppearance,
  override: IRGraphRelationAppearanceTokenOverrides,
): EffectiveRelationAppearance => ({
  ...current,
  ...override,
  ...(current.sourceMarker === undefined && override.sourceMarker === undefined
    ? {}
    : { sourceMarker: mergeMarkerAppearance(current.sourceMarker, override.sourceMarker) }),
  ...(current.targetMarker === undefined && override.targetMarker === undefined
    ? {}
    : { targetMarker: mergeMarkerAppearance(current.targetMarker, override.targetMarker) }),
});

const mergeMatchingRules = (
  appearance: EffectiveRelationAppearance,
  rules: ReadonlyArray<IRGraphRelationThemeRule>,
  subject: Parameters<typeof matchesGraphThemeSelector>[1],
): EffectiveRelationAppearance =>
  rules.reduce<EffectiveRelationAppearance>(
    (current, rule) =>
      matchesGraphThemeSelector(rule.selector, subject) ? mergeAppearance(current, rule.appearance) : current,
    appearance,
  );

type RelationGraphThemeOverrideContext = RelationResolveContext &
  Readonly<{ layers: ReadonlyArray<IRGraphThemeLayer> }>;

const relationSubject = (relation: CanonicalRelation) => ({
  role: relation.source.role,
  ...(relation.source.kind === undefined ? {} : { kind: relation.source.kind }),
  ...(relation.source.status === undefined ? {} : { status: relation.source.status }),
  ...(relation.predicate === undefined
    ? {}
    : { predicate: { name: relation.predicate.definition.name, params: relation.predicate.params } }),
  direction: relation.effectiveDirection,
});

/** 合并两组稀疏 Relation appearance，并对 marker 子对象逐字段叠加 */
const mergeSparseAppearance = (
  current: IRGraphRelationAppearanceTokenOverrides,
  override: IRGraphRelationAppearanceTokenOverrides,
): IRGraphRelationAppearanceTokenOverrides => ({
  ...current,
  ...override,
  ...(current.sourceMarker === undefined && override.sourceMarker === undefined
    ? {}
    : { sourceMarker: mergeMarkerAppearance(current.sourceMarker, override.sourceMarker) }),
  ...(current.targetMarker === undefined && override.targetMarker === undefined
    ? {}
    : { targetMarker: mergeMarkerAppearance(current.targetMarker, override.targetMarker) }),
});

/** 只投影 Graph-local layer 对当前 Relation 的稀疏 appearance，不解析 Core Theme baseline */
export const resolveRelationGraphThemeOverrides = (
  relation: CanonicalRelation,
  context: RelationGraphThemeOverrideContext,
): IRGraphRelationAppearanceTokenOverrides => {
  const selectorContext = {
    member: 'Relation' as const,
    roles: context.relationRoles,
    kinds: context.relationKinds,
    predicates: context.relationPredicates,
  };
  const rules = context.layers.flatMap(layer =>
    layer.rules.filter((rule): rule is IRGraphRelationThemeRule => rule.type === 'relation'),
  );
  for (const rule of rules) validateGraphThemeSelector(rule.selector, selectorContext);
  return rules.reduce<IRGraphRelationAppearanceTokenOverrides>(
    (current, rule) =>
      matchesGraphThemeSelector(rule.selector, relationSubject(relation))
        ? mergeSparseAppearance(current, rule.appearance)
        : current,
    {},
  );
};

const RELATION_APPEARANCE_FIELDS = [
  'color',
  'stroke',
  'strokeWidth',
  'strokeOpacity',
  'opacity',
  'shadow',
  'blendMode',
  'lineCap',
  'lineJoin',
  'dashOffset',
  'sourceMarker',
  'targetMarker',
  'labelTextForeground',
  'labelFont',
  'labelOpacity',
] as const satisfies ReadonlyArray<keyof IRGraphRelationAppearanceTokenOverrides>;

/** 从 Relation generated/source record 中提取作者优先的 appearance 字段 */
const sourceAppearanceOf = (relation: CanonicalRelation): IRGraphRelationAppearanceTokenOverrides =>
  Object.fromEntries(
    RELATION_APPEARANCE_FIELDS.flatMap(key => {
      const value = relation.source[key];
      return value === undefined ? [] : [[key, value]];
    }),
  );

/**
 * 把未由 Source 或 Theme 显式指定的 `currentColor` 路径描边绑定到 Relation 主色
 *
 * Graph Theme 以 `color` 作为 Relation 路径、箭头与标签共用的主色。Core Path 只有在
 * `stroke` 缺省时才会采用该主色，因此这里在所有 Theme rule 与 Source appearance 合并后
 * 确定实际描边，同时保留显式 `stroke` 的优先级
 */
const resolveRelationStroke = (
  appearance: EffectiveRelationAppearance,
  sourceAppearance: IRGraphRelationAppearanceTokenOverrides,
): EffectiveRelationAppearance => {
  if (
    sourceAppearance.stroke !== undefined ||
    appearance.stroke !== 'currentColor' ||
    typeof appearance.color !== 'string'
  ) {
    return appearance;
  }
  return { ...appearance, stroke: appearance.color };
};

/** 把 Canonical Relation 与当前位置 Theme rules 确定为唯一有效外观 */
export const resolveRelationAppearance = (
  relation: CanonicalRelation,
  context: RelationAppearanceResolveContext,
): EffectiveRelationAppearance => {
  const graphTheme = resolveGraphTheme(context.theme, context.graphThemeStyles);
  const selectorContext = {
    member: 'Relation' as const,
    roles: context.relationRoles,
    kinds: context.relationKinds,
    predicates: context.relationPredicates,
  };
  const styleRules = graphTheme.relation.rules ?? [];
  const layerRules = (context.layers ?? []).flatMap(layer =>
    layer.rules.filter((rule): rule is IRGraphRelationThemeRule => rule.type === 'relation'),
  );
  for (const rule of [...styleRules, ...layerRules]) validateGraphThemeSelector(rule.selector, selectorContext);
  const subject = relationSubject(relation);
  const styled = mergeMatchingRules(graphTheme.relation.tokens, styleRules, subject);
  const sourceAppearance = sourceAppearanceOf(relation);
  return resolveRelationStroke(
    mergeAppearance(mergeMatchingRules(styled, layerRules, subject), sourceAppearance),
    sourceAppearance,
  );
};
