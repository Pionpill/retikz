import type { RelationPredicateDefinition } from '../../contract';
import type {
  IRGraphRelation,
  IRGraphRelationDefaults,
  IRGraphRelationDefaultsStyle,
  IRGraphRelationRule,
  IRGraphRelationStructureTokenOverrides,
} from '../../schemas';
import type {
  CanonicalRelation,
  CanonicalRelationPredicate,
  EffectiveRelationAppearance,
  EffectiveRelationStructure,
  RelationAppearanceResolveContext,
  RelationGraphLayerResolveContext,
  RelationResolveContext,
} from './types';

import { RetikzGraphError, RetikzGraphErrorCode } from '../../errors';
import { GraphRelationStructureTokenOverridesSchema } from '../../schemas';
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

const mergeRelationAppearance = (
  current: EffectiveRelationAppearance | undefined,
  override: IRGraphRelationDefaults | undefined,
): EffectiveRelationAppearance =>
  mergeGraphDefaults(
    current === undefined ? undefined : { relation: current },
    override === undefined ? undefined : { relation: override },
  )?.relation ?? {};

const relationRuleAppearance = (rule: IRGraphRelationRule): IRGraphRelationDefaults => ({
  ...(rule.style === undefined ? {} : { style: rule.style }),
  ...(rule.sourceMarker === undefined ? {} : { sourceMarker: rule.sourceMarker }),
  ...(rule.targetMarker === undefined ? {} : { targetMarker: rule.targetMarker }),
  ...(rule.labelTextForeground === undefined ? {} : { labelTextForeground: rule.labelTextForeground }),
  ...(rule.labelFont === undefined ? {} : { labelFont: rule.labelFont }),
  ...(rule.labelOpacity === undefined ? {} : { labelOpacity: rule.labelOpacity }),
});

const relationSubject = (relation: CanonicalRelation) => ({
  role: relation.source.role,
  ...(relation.source.kind === undefined ? {} : { kind: relation.source.kind }),
  ...(relation.source.status === undefined ? {} : { status: relation.source.status }),
  ...(relation.predicate === undefined
    ? {}
    : { predicate: { name: relation.predicate.definition.name, params: relation.predicate.params } }),
  direction: relation.effectiveDirection,
});

const selectorContextOf = (context: RelationResolveContext) => ({
  member: 'Relation' as const,
  roles: context.relationRoles,
  kinds: context.relationKinds,
  predicates: context.relationPredicates,
});

const resolveRelationAuthorAppearance = (
  relation: CanonicalRelation,
  context: RelationGraphLayerResolveContext,
): EffectiveRelationAppearance => {
  const selectorContext = selectorContextOf(context);
  const subject = relationSubject(relation);
  let appearance: EffectiveRelationAppearance = {};
  for (const layer of context.layers) {
    appearance = mergeRelationAppearance(appearance, layer.defaults?.relation);
    for (const rule of layer.rules ?? []) {
      if (rule.type !== 'relation') continue;
      validateGraphThemeSelector(rule.selector, selectorContext);
      if (matchesGraphThemeSelector(rule.selector, subject)) {
        appearance = mergeRelationAppearance(appearance, relationRuleAppearance(rule));
      }
    }
  }
  return appearance;
};

const relationSourceAppearanceOf = (source: IRGraphRelation): IRGraphRelationDefaults => {
  const style = source.style;
  const sourceStyle: IRGraphRelationDefaultsStyle | undefined =
    style === undefined
      ? undefined
      : {
          color: style.color,
          stroke: style.stroke,
          strokeWidth: style.strokeWidth,
          strokeOpacity: style.strokeOpacity,
          opacity: style.opacity,
          shadow: style.shadow,
          blendMode: style.blendMode,
          lineCap: style.lineCap,
          lineJoin: style.lineJoin,
          dashOffset: style.dashOffset,
        };
  return {
    ...(sourceStyle === undefined ? {} : { style: sourceStyle }),
    ...(source.sourceMarker === undefined ? {} : { sourceMarker: source.sourceMarker }),
    ...(source.targetMarker === undefined ? {} : { targetMarker: source.targetMarker }),
    ...(source.labelTextForeground === undefined ? {} : { labelTextForeground: source.labelTextForeground }),
    ...(source.labelFont === undefined ? {} : { labelFont: source.labelFont }),
    ...(source.labelOpacity === undefined ? {} : { labelOpacity: source.labelOpacity }),
  };
};

const projectDefinedFields = <T extends object>(value: T | undefined): Partial<T> =>
  value === undefined
    ? {}
    : (Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as Partial<T>);

/** 把作者 Graph defaults/rules 按层投影到 Relation Source */
export const projectRelationGraphLayers = (
  relation: CanonicalRelation,
  context: RelationGraphLayerResolveContext,
): IRGraphRelation => {
  const authorAppearance = resolveRelationAuthorAppearance(relation, context);
  if (Object.keys(authorAppearance).length === 0) return relation.source;
  const projected = mergeRelationAppearance(authorAppearance, relationSourceAppearanceOf(relation.source));
  const style = {
    ...projectDefinedFields(projected.style),
    ...projectDefinedFields(relation.source.style),
  };
  return {
    ...relation.source,
    ...(projected.sourceMarker === undefined ? {} : { sourceMarker: projected.sourceMarker }),
    ...(projected.targetMarker === undefined ? {} : { targetMarker: projected.targetMarker }),
    ...(projected.labelTextForeground === undefined ? {} : { labelTextForeground: projected.labelTextForeground }),
    ...(projected.labelFont === undefined ? {} : { labelFont: projected.labelFont }),
    ...(projected.labelOpacity === undefined ? {} : { labelOpacity: projected.labelOpacity }),
    ...(Object.keys(style).length === 0 ? {} : { style }),
  };
};

const resolveRelationStroke = (
  appearance: EffectiveRelationAppearance,
  sourceAppearance: IRGraphRelationDefaults,
): EffectiveRelationAppearance => {
  const sourceStroke = sourceAppearance.style?.stroke;
  const stroke = appearance.style?.stroke;
  const color = appearance.style?.color;
  if (sourceStroke !== undefined || stroke !== 'currentColor' || typeof color !== 'string') {
    return appearance;
  }
  return { ...appearance, style: { ...appearance.style, stroke: color } };
};

/** 把 Canonical Relation 与当前 Core Theme rules 确定为有效外观 */
export const resolveRelationAppearance = (
  relation: CanonicalRelation,
  context: RelationAppearanceResolveContext,
): EffectiveRelationAppearance => {
  const graphTheme = resolveGraphTheme(context.theme, context.graphThemeStyles);
  const selectorContext = selectorContextOf(context);
  const subject = relationSubject(relation);
  let appearance: EffectiveRelationAppearance = graphTheme.defaults.relation ?? {};
  for (const rule of graphTheme.rules) {
    if (rule.type !== 'relation') continue;
    validateGraphThemeSelector(rule.selector, selectorContext);
    if (matchesGraphThemeSelector(rule.selector, subject)) {
      appearance = mergeRelationAppearance(appearance, relationRuleAppearance(rule));
    }
  }
  const sourceAppearance = relationSourceAppearanceOf(relation.source);
  return resolveRelationStroke(mergeRelationAppearance(appearance, sourceAppearance), sourceAppearance);
};
