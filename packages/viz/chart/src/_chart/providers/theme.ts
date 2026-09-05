import type { ResolvedTheme } from '@retikz/core';

import { ZodError } from 'zod';

import type { ChartThemeDefinition } from '../contract';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import { ChartThemeDefinitionSchema } from '../schemas';

const pathOf = (prefix: ReadonlyArray<string | number>, error: ZodError): ReadonlyArray<string | number> => {
  const issue = error.issues.at(0);
  const issuePath = (issue?.path ?? []).map(segment => (typeof segment === 'symbol' ? String(segment) : segment));
  const unknownKey = issue?.code === 'unrecognized_keys' ? issue.keys.at(0) : undefined;
  return unknownKey === undefined
    ? [...prefix, ...issuePath]
    : [...prefix, ...issuePath, typeof unknownKey === 'symbol' ? String(unknownKey) : unknownKey];
};

const invalidThemeDefinition = (error: ZodError): RetikzChartError =>
  new RetikzChartError({
    code: RetikzChartErrorCode.InvalidRegistry,
    message: 'Chart theme definition has an invalid declaration',
    details: { path: pathOf(['themes'], error) },
    cause: error,
  });

/** 校验当前 active Chart Theme Definition */
export const parseChartThemeDefinition = (
  theme: ChartThemeDefinition,
  recipes: ReadonlyMap<string, unknown>,
): ChartThemeDefinition => {
  void recipes;
  try {
    return ChartThemeDefinitionSchema.parse(theme);
  } catch (error) {
    if (error instanceof ZodError) throw invalidThemeDefinition(error);
    throw error;
  }
};

/** 校验当前 active 命名主题的 base 链与继承环 */
export const validateChartThemeBases = (themes: ReadonlyMap<string, ChartThemeDefinition>): void => {
  for (const theme of themes.values()) {
    const visiting = new Set<string>();
    let current: string | undefined = theme.name;
    while (current !== undefined) {
      if (visiting.has(current)) {
        throw new RetikzChartError({
          code: RetikzChartErrorCode.ThemeCycle,
          message: `Chart theme inheritance cycle detected at "${current}"`,
          details: { path: ['themes', theme.name, 'base'], theme: current },
        });
      }
      visiting.add(current);
      const definition = themes.get(current);
      if (definition === undefined) {
        throw new RetikzChartError({
          code: RetikzChartErrorCode.MissingDependency,
          message: `Chart theme "${theme.name}" references unknown base "${current}"`,
          details: { path: ['themes', theme.name, 'base'], base: current },
        });
      }
      current = definition.base;
    }
  }
};

const chartThemeChainOf = (
  name: string,
  themes: ReadonlyMap<string, ChartThemeDefinition>,
  path: ReadonlyArray<string | number>,
): ReadonlyArray<ChartThemeDefinition> => {
  const chain: Array<ChartThemeDefinition> = [];
  const visiting = new Set<string>();
  let current: string | undefined = name;
  while (current !== undefined) {
    if (visiting.has(current)) {
      throw new RetikzChartError({
        code: RetikzChartErrorCode.ThemeCycle,
        message: `Chart theme inheritance cycle detected at "${current}"`,
        details: { path },
      });
    }
    visiting.add(current);
    const definition = themes.get(current);
    if (definition === undefined) {
      throw new RetikzChartError({
        code: RetikzChartErrorCode.UnknownDefinition,
        message: `Chart theme "${current}" is not registered`,
        details: { path },
      });
    }
    chain.unshift(definition);
    current = definition.base;
  }
  return chain;
};

/** 按 Core style 选取去重后的 active Theme Definition */
export const chartThemeDefinitionsOf = (
  theme: ResolvedTheme,
  themes: ReadonlyMap<string, ChartThemeDefinition>,
): ReadonlyArray<ChartThemeDefinition> => {
  if (theme.style === undefined) return [];
  return chartThemeChainOf(theme.style, themes, ['theme', 'style']);
};
