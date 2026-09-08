import type { ResolvedTheme } from '@retikz/core';
import type { JsonObject, JsonValue } from '@retikz/foundation';

import { array, strictObject } from 'zod';

import type { GraphThemeStyleDefinition, GraphThemeStyleSource } from '../../contract';
import type {
  IRGraphDefaults,
  IRGraphEntityDefaults,
  IRGraphEntityDefaultsLayout,
  IRGraphEntityDefaultsStyle,
  IRGraphEntityThemeSelector,
  IRGraphRelationDefaults,
  IRGraphRelationDefaultsStyle,
  IRGraphRelationThemeSelector,
  IRGraphRule,
  IRGraphSurfaceDefaults,
} from '../../schemas';
import type { GraphAuthorLayer, GraphThemeResolution } from './types';

import { RetikzGraphError, RetikzGraphErrorCode } from '../../errors';
import { getDefaultGraphThemePreset } from '../../providers';
import { GraphDefaultsSchema, GraphRuleSchema } from '../../schemas';

/** 只保留这一层明确提供的字段，不展开复合叶子 */
const definedFields = <T extends object>(value: T | undefined): Partial<T> =>
  value === undefined
    ? {}
    : (Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as Partial<T>);

/** 按字段覆盖一个已选定的命名组，空组不物化 */
const mergeFields = <T extends object>(current: T | undefined, override: T | undefined): T | undefined => {
  const merged = { ...definedFields(current), ...definedFields(override) };
  return Object.keys(merged).length === 0 ? undefined : (merged as T);
};

/** 空 font 不提供默认值；非空 font 保持 Node Source 的整体覆盖粒度 */
const definedEntityStyle = (style: IRGraphEntityDefaultsStyle | undefined): IRGraphEntityDefaultsStyle | undefined => {
  if (style === undefined) return undefined;
  const { font, ...fields } = definedFields(style);
  const definedFont = mergeFields(undefined, font);
  return { ...fields, ...(definedFont === undefined ? {} : { font: definedFont }) };
};

/** 合并 Entity 的 style/layout 命名组 */
const mergeEntityDefaults = (
  current: IRGraphEntityDefaults | undefined,
  override: IRGraphEntityDefaults | undefined,
): IRGraphEntityDefaults | undefined => {
  if (current === undefined && override === undefined) return undefined;
  const style = mergeFields(definedEntityStyle(current?.style), definedEntityStyle(override?.style));
  const layout = mergeFields<IRGraphEntityDefaultsLayout>(current?.layout, override?.layout);
  return {
    ...(style === undefined ? {} : { style }),
    ...(layout === undefined ? {} : { layout }),
  };
};

/** 按 Relation Source 的粒度合并路径外观、marker 与标签字体 */
const mergeRelationDefaults = (
  current: IRGraphRelationDefaults | undefined,
  override: IRGraphRelationDefaults | undefined,
): IRGraphRelationDefaults | undefined => {
  if (current === undefined && override === undefined) return undefined;
  const style = mergeFields<IRGraphRelationDefaultsStyle>(current?.style, override?.style);
  const sourceMarker = mergeFields(current?.sourceMarker, override?.sourceMarker);
  const targetMarker = mergeFields(current?.targetMarker, override?.targetMarker);
  const labelFont = mergeFields(current?.labelFont, override?.labelFont);
  const labelTextForeground = override?.labelTextForeground ?? current?.labelTextForeground;
  const labelOpacity = override?.labelOpacity ?? current?.labelOpacity;
  return {
    ...(labelTextForeground === undefined ? {} : { labelTextForeground }),
    ...(labelOpacity === undefined ? {} : { labelOpacity }),
    ...(style === undefined ? {} : { style }),
    ...(sourceMarker === undefined ? {} : { sourceMarker }),
    ...(targetMarker === undefined ? {} : { targetMarker }),
    ...(labelFont === undefined ? {} : { labelFont }),
  };
};

/** 合并一层 Graph Surface defaults，并按字段跳过 undefined */
export const mergeGraphSurfaceDefaults = (
  current: IRGraphSurfaceDefaults | undefined,
  override: IRGraphSurfaceDefaults | undefined,
): IRGraphSurfaceDefaults | undefined => {
  if (current === undefined && override === undefined) return undefined;
  return { ...definedFields(current), ...definedFields(override) };
};

/** 合并一层 Graph defaults，并保持各目标字段的 Source 覆盖粒度 */
export const mergeGraphDefaults = (
  current: IRGraphDefaults | undefined,
  override: IRGraphDefaults | undefined,
): IRGraphDefaults | undefined => {
  if (current === undefined && override === undefined) return undefined;
  const entity = mergeEntityDefaults(current?.entity, override?.entity);
  const relation = mergeRelationDefaults(current?.relation, override?.relation);
  const group = mergeGraphSurfaceDefaults(current?.group, override?.group);
  const block = mergeGraphSurfaceDefaults(current?.block, override?.block);
  return {
    ...definedFields(current),
    ...definedFields(override),
    ...(entity === undefined ? {} : { entity }),
    ...(relation === undefined ? {} : { relation }),
    ...(group === undefined ? {} : { group }),
    ...(block === undefined ? {} : { block }),
  };
};

/** 按作用域顺序提取作者层对一个容器 shell 的 Surface defaults */
export const resolveGraphAuthorSurfaceDefaults = (
  layers: ReadonlyArray<GraphAuthorLayer>,
  target: 'group' | 'block',
): IRGraphSurfaceDefaults | undefined =>
  layers.reduce<IRGraphSurfaceDefaults | undefined>(
    (current, layer) => mergeGraphSurfaceDefaults(current, layer.defaults?.[target]),
    undefined,
  );

const mergeRules = (defaults: ReadonlyArray<IRGraphRule>, overrides: ReadonlyArray<IRGraphRule> | undefined) => [
  ...defaults,
  ...(overrides ?? []),
];

const GraphThemeStyleSourceSchema = strictObject({
  defaults: GraphDefaultsSchema.optional(),
  rules: array(GraphRuleSchema).optional(),
});

const parseGraphThemeStyleSource = (source: GraphThemeStyleSource): GraphThemeStyleSource =>
  GraphThemeStyleSourceSchema.parse(source);

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

/** 判断完整 Canonical 成员语义是否匹配一条 Graph selector */
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

/** 按当前 Core Theme style 解析 Graph defaults 与有序 rules */
export const resolveGraphTheme = (
  theme: ResolvedTheme,
  styles: ReadonlyMap<string, GraphThemeStyleDefinition>,
): GraphThemeResolution => {
  const baseline = getDefaultGraphThemePreset(theme);
  if (theme.style === undefined) return baseline;
  const definition = styles.get(theme.style);
  if (definition === undefined) {
    throw new RetikzGraphError({
      code: RetikzGraphErrorCode.DefinitionNotRegistered,
      message: `Graph theme style '${theme.style}' is not registered.`,
      details: { capability: 'graph-theme-style', key: theme.style, availableKeys: [...styles.keys()] },
    });
  }
  try {
    const source = parseGraphThemeStyleSource(definition.resolve(theme));
    return {
      defaults: mergeGraphDefaults(baseline.defaults, source.defaults) ?? baseline.defaults,
      rules: mergeRules(baseline.rules, source.rules),
    };
  } catch (cause) {
    throw new RetikzGraphError({
      code: RetikzGraphErrorCode.DefinitionCallbackFailed,
      message: `Graph theme style '${theme.style}' resolution failed.`,
      details: { capability: 'graph-theme-style', key: theme.style },
      cause,
    });
  }
};
