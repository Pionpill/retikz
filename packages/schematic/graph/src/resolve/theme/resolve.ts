import type { ResolvedTheme } from '@retikz/core';
import type { JsonObject, JsonValue } from '@retikz/foundation';

import { SurfaceInputSchema } from '@retikz/standard';
import { array, strictObject } from 'zod';

import type {
  GraphRelationThemeStyleTokens,
  GraphThemeStyleDefinition,
  GraphThemeStyleOverrides,
  GraphThemeStyleResolution,
} from '../../contract';
import type {
  IRGraphEntityThemeRule,
  IRGraphEntityThemeSelector,
  IRGraphRelationAppearanceTokenOverrides,
  IRGraphRelationThemeRule,
  IRGraphRelationThemeSelector,
} from '../../schemas';
import type { GraphThemeResolution } from './types';

import { RetikzGraphError, RetikzGraphErrorCode } from '../../errors';
import { getDefaultGraphThemePreset } from '../../providers';
import {
  GraphEntityAppearanceTokenOverridesSchema,
  GraphEntityThemeRuleSchema,
  GraphRelationAppearanceTokenOverridesSchema,
  GraphRelationThemeRuleSchema,
} from '../../schemas';

const GraphThemeStyleOverridesSchema = strictObject({
  entity: strictObject({
    tokens: GraphEntityAppearanceTokenOverridesSchema.optional(),
    rules: array(GraphEntityThemeRuleSchema).optional(),
  }).optional(),
  relation: strictObject({
    tokens: GraphRelationAppearanceTokenOverridesSchema.optional(),
    rules: array(GraphRelationThemeRuleSchema).optional(),
  }).optional(),
  group: strictObject({
    tokens: strictObject({
      background: SurfaceInputSchema.shape.background,
      border: SurfaceInputSchema.shape.border,
      cornerRadius: SurfaceInputSchema.shape.cornerRadius,
    }).refine(tokens => Object.keys(tokens).length > 0, {
      message: 'Graph Group theme style tokens require at least one field.',
    }),
  }).optional(),
  block: strictObject({
    tokens: strictObject({
      background: SurfaceInputSchema.shape.background,
      border: SurfaceInputSchema.shape.border,
      cornerRadius: SurfaceInputSchema.shape.cornerRadius,
    }).refine(tokens => Object.keys(tokens).length > 0, {
      message: 'Graph Block theme style tokens require at least one field.',
    }),
  }).optional(),
});

const mergeRules = <TRule>(
  defaults: ReadonlyArray<TRule> | undefined,
  overrides: ReadonlyArray<TRule> | undefined,
): ReadonlyArray<TRule> | undefined => {
  const rules = [...(defaults ?? []), ...(overrides ?? [])];
  return rules.length === 0 ? undefined : rules;
};

const mergeMarkerAppearance = (
  defaults: IRGraphRelationAppearanceTokenOverrides['sourceMarker'],
  overrides: IRGraphRelationAppearanceTokenOverrides['sourceMarker'],
): IRGraphRelationAppearanceTokenOverrides['sourceMarker'] =>
  defaults === undefined && overrides === undefined ? undefined : { ...defaults, ...overrides };

const mergeRelationTokens = (
  defaults: GraphRelationThemeStyleTokens,
  overrides: IRGraphRelationAppearanceTokenOverrides | undefined,
): GraphRelationThemeStyleTokens => ({
  ...defaults,
  ...overrides,
  ...(defaults.sourceMarker === undefined && overrides?.sourceMarker === undefined
    ? {}
    : { sourceMarker: mergeMarkerAppearance(defaults.sourceMarker, overrides?.sourceMarker) }),
  ...(defaults.targetMarker === undefined && overrides?.targetMarker === undefined
    ? {}
    : { targetMarker: mergeMarkerAppearance(defaults.targetMarker, overrides?.targetMarker) }),
});

const mergeGraphThemeStyle = (
  defaults: GraphThemeStyleResolution,
  overrides: GraphThemeStyleOverrides,
): GraphThemeStyleResolution => {
  const entityRules = mergeRules<IRGraphEntityThemeRule>(defaults.entity.rules, overrides.entity?.rules);
  const relationRules = mergeRules<IRGraphRelationThemeRule>(defaults.relation.rules, overrides.relation?.rules);
  return {
    entity: {
      tokens: { ...defaults.entity.tokens, ...overrides.entity?.tokens },
      ...(entityRules === undefined ? {} : { rules: entityRules }),
    },
    relation: {
      tokens: mergeRelationTokens(defaults.relation.tokens, overrides.relation?.tokens),
      ...(relationRules === undefined ? {} : { rules: relationRules }),
    },
    group: {
      tokens: { ...defaults.group.tokens, ...overrides.group?.tokens },
    },
    block: {
      tokens: { ...defaults.block.tokens, ...overrides.block?.tokens },
    },
  };
};

const jsonEqual = (left: JsonValue, right: JsonValue): boolean => {
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => jsonEqual(value, right[index]))
    );
  }
  if (typeof left === 'object' && left !== null && typeof right === 'object' && right !== null) {
    const leftObject = left as JsonObject;
    const rightObject = right as JsonObject;
    const keys = Object.keys(leftObject);
    return (
      keys.length === Object.keys(rightObject).length && keys.every(key => jsonEqual(leftObject[key], rightObject[key]))
    );
  }
  return left === right;
};

const isJsonObject = (value: JsonValue): value is JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** 判断 selector params 是否为 Canonical params 的递归子集 */
export const matchesGraphPredicateParams = (selector: JsonObject, params: JsonObject): boolean =>
  Object.entries(selector).every(([key, expected]) => {
    if (!Object.hasOwn(params, key)) return false;
    const actual = params[key];
    if (isJsonObject(expected) && isJsonObject(actual)) {
      return matchesGraphPredicateParams(expected, actual);
    }
    return jsonEqual(expected, actual);
  });

const selectorIncludes = (selector: string | ReadonlyArray<string> | undefined, value: string | undefined): boolean =>
  selector === undefined ||
  (value !== undefined && (typeof selector === 'string' ? selector === value : selector.includes(value)));

type CanonicalSelectorSubject = Readonly<{
  role: string;
  kind?: string;
  predicate?: Readonly<{ name: string; params: JsonObject }>;
  status?: string;
  direction?: string;
}>;

/** 判断完整 Canonical 成员语义是否匹配一条 Graph Theme selector */
export const matchesGraphThemeSelector = (
  selector: IRGraphEntityThemeSelector | IRGraphRelationThemeSelector | undefined,
  subject: CanonicalSelectorSubject,
): boolean => {
  if (selector === undefined) return true;
  if (!selectorIncludes(selector.role, subject.role)) return false;
  if (!selectorIncludes(selector.kind, subject.kind)) return false;
  if (!selectorIncludes(selector.status, subject.status)) return false;
  if ('direction' in selector && !selectorIncludes(selector.direction, subject.direction)) return false;
  if (selector.predicate === undefined) return true;
  if (subject.predicate === undefined || !selectorIncludes(selector.predicate.name, subject.predicate.name))
    return false;
  return (
    selector.predicate.params === undefined ||
    matchesGraphPredicateParams(selector.predicate.params, subject.predicate.params)
  );
};

/** Theme selector 校验所需的成员专属 definitions */
export type GraphThemeSelectorRegistryContext = Readonly<{
  member: 'Entity' | 'Relation';
  roles: ReadonlyMap<string, unknown>;
  kinds: ReadonlyMap<string, unknown>;
  predicates: ReadonlyMap<string, unknown>;
}>;

const selectorKeys = (value: string | ReadonlyArray<string> | undefined): ReadonlyArray<string> =>
  value === undefined ? [] : typeof value === 'string' ? [value] : value;

const assertSelectorKeysRegistered = (
  keys: ReadonlyArray<string>,
  registry: ReadonlyMap<string, unknown>,
  capability: string,
): void => {
  for (const key of keys) {
    if (!registry.has(key)) {
      throw new RetikzGraphError({
        code: RetikzGraphErrorCode.DefinitionNotRegistered,
        message: `${capability} selector key '${key}' is not registered.`,
        details: { capability, key, availableKeys: [...registry.keys()] },
      });
    }
  }
};

/** 校验 Theme selector 引用的全部开放 key 已在对应成员 registry 注册 */
export const validateGraphThemeSelector = (
  selector: IRGraphEntityThemeSelector | IRGraphRelationThemeSelector | undefined,
  context: GraphThemeSelectorRegistryContext,
): void => {
  if (selector === undefined) return;
  const capabilityPrefix = context.member.toLowerCase();
  assertSelectorKeysRegistered(selectorKeys(selector.role), context.roles, `${capabilityPrefix}-role`);
  assertSelectorKeysRegistered(selectorKeys(selector.kind), context.kinds, `${capabilityPrefix}-kind`);
  assertSelectorKeysRegistered(
    selectorKeys(selector.predicate?.name),
    context.predicates,
    `${capabilityPrefix}-predicate`,
  );
};

/** 按当前 Core Theme style 解析完整 Graph baseline 与有序规则 */
export const resolveGraphTheme = (
  theme: ResolvedTheme,
  styles: ReadonlyMap<string, GraphThemeStyleDefinition>,
): GraphThemeResolution => {
  const defaults = getDefaultGraphThemePreset(theme);
  if (theme.style === undefined) return defaults;
  const definition = styles.get(theme.style);
  if (definition === undefined) {
    throw new RetikzGraphError({
      code: RetikzGraphErrorCode.DefinitionNotRegistered,
      message: `Graph theme style '${theme.style}' is not registered.`,
      details: { capability: 'graph-theme-style', key: theme.style, availableKeys: [...styles.keys()] },
    });
  }
  try {
    const rawOverrides = definition.resolve(theme);
    const overrides = GraphThemeStyleOverridesSchema.parse(rawOverrides);
    return mergeGraphThemeStyle(defaults, overrides);
  } catch (cause) {
    throw new RetikzGraphError({
      code: RetikzGraphErrorCode.DefinitionCallbackFailed,
      message: `Graph theme style '${theme.style}' resolution failed.`,
      details: { capability: 'graph-theme-style', key: theme.style },
      cause,
    });
  }
};
