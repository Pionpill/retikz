import type { ThemeTokenContribution, ThemeTokenDefinition } from './types';

import { cloneAndFreezeJson } from '../../shared/json';
import { assertNonEmptyString } from '../../shared/utils';

/** 定义一个冻结的 owner Theme token namespace definition */
export const defineThemeTokenNamespace = <
  const TNamespace extends string,
  TTokens extends Readonly<Record<string, unknown>>,
  TDefinition extends ThemeTokenDefinition<TNamespace, TTokens> = ThemeTokenDefinition<TNamespace, TTokens>,
>(
  definition: TDefinition,
): TDefinition => {
  assertNonEmptyString(definition.namespace, 'defineThemeTokenNamespace: namespace');
  return Object.freeze({ namespace: definition.namespace, schema: definition.schema }) as TDefinition;
};

/** 创建脱离输入并递归冻结的纯 JSON token contribution */
export const defineThemeTokenContribution = <
  const TNamespace extends string,
  TTokens extends Readonly<Record<string, unknown>>,
>(
  contribution: ThemeTokenContribution<TNamespace, TTokens>,
): ThemeTokenContribution<TNamespace, TTokens> => {
  const snapshot = cloneAndFreezeJson(contribution, 'Theme token contribution');
  assertNonEmptyString(snapshot.namespace, 'defineThemeTokenContribution: namespace');
  return snapshot;
};
