import { z } from 'zod';

import type { IRJsonObject } from '../../schemas';
import type { AnyThemeTokenContribution, ThemeTokenContribution, ThemeTokenDefinition } from './types';

import { cloneAndFreezeJson } from '../../shared/json';

const assertNamespace: (namespace: unknown, owner: string) => asserts namespace is string = (namespace, owner) => {
  if (typeof namespace !== 'string' || namespace.trim().length === 0) {
    throw new Error(`${owner}: namespace must be a non-empty string.`);
  }
};

/** 定义一个冻结的 owner Theme token namespace definition */
export const defineThemeTokenNamespace = <
  const TNamespace extends string,
  TTokens extends Readonly<Record<string, unknown>>,
  TDefinition extends ThemeTokenDefinition<TNamespace, TTokens> = ThemeTokenDefinition<TNamespace, TTokens>,
>(
  definition: TDefinition,
): TDefinition => {
  assertNamespace(definition.namespace, 'defineThemeTokenNamespace');
  if (!(definition.schema instanceof z.ZodType)) {
    throw new Error('defineThemeTokenNamespace: schema must be a Zod schema.');
  }
  return Object.freeze({ namespace: definition.namespace, schema: definition.schema }) as TDefinition;
};

/** 创建脱离输入并递归冻结的纯 JSON token contribution */
export const defineThemeTokenContribution = <
  const TNamespace extends string,
  TTokens extends Readonly<Record<string, unknown>>,
>(
  contribution: ThemeTokenContribution<TNamespace, TTokens>,
): ThemeTokenContribution<TNamespace, TTokens> => {
  const snapshot = cloneAndFreezeJson(contribution, 'Theme token contribution') as Readonly<{
    namespace: unknown;
    tokens: unknown;
  }>;
  assertNamespace(snapshot.namespace, 'defineThemeTokenContribution');
  const keys = Object.keys(snapshot);
  if (keys.length !== 2 || !keys.includes('namespace') || !keys.includes('tokens')) {
    throw new Error('defineThemeTokenContribution: contribution must contain only namespace and tokens.');
  }
  if (snapshot.tokens === null || typeof snapshot.tokens !== 'object' || Array.isArray(snapshot.tokens)) {
    throw new Error('defineThemeTokenContribution: tokens must be a plain JSON object.');
  }
  return Object.freeze({ namespace: snapshot.namespace as TNamespace, tokens: snapshot.tokens as TTokens });
};

/** 按调用顺序组合 namespace contribution，并拒绝同次重复 namespace */
export const composeThemeTokenOverrides = (
  ...contributions: ReadonlyArray<AnyThemeTokenContribution>
): Readonly<Record<string, IRJsonObject>> => {
  const result: Record<string, IRJsonObject> = Object.create(null) as Record<string, IRJsonObject>;
  const namespaces = new Set<string>();
  for (const contribution of contributions) {
    const normalized = defineThemeTokenContribution(contribution);
    if (namespaces.has(normalized.namespace)) {
      throw new Error(`Duplicate Theme token namespace "${normalized.namespace}" in one contribution composition.`);
    }
    namespaces.add(normalized.namespace);
    result[normalized.namespace] = normalized.tokens as IRJsonObject;
  }
  return Object.freeze(result);
};
