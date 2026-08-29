import type { ResolvedTheme } from '@retikz/core';

import { JsonObjectSchema } from '@retikz/core';
import { assertPlainDataContainers, NonBlankStringSchema } from '@retikz/foundation';
import { PlotThemeTokenOverridesSchema } from '@retikz/plot';
import { record, strictObject, ZodError } from 'zod';

import type { AnyChartRecipeDefinition, ChartThemeDefinition } from '../contract';
import type { IRChartSource } from '../schemas';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import { ChartThemeOverridesSchema } from '../schemas';

const ChartThemeDefinitionEnvelopeSchema = strictObject({
  name: NonBlankStringSchema.describe('Registered Chart theme name'),
  base: NonBlankStringSchema.optional().describe('Optional registered base Chart theme name'),
  tokens: strictObject({
    chart: JsonObjectSchema.optional().describe('Sparse Chart shell token slice'),
    plot: JsonObjectSchema.optional().describe('Sparse Plot token slice'),
    recipes: record(NonBlankStringSchema, JsonObjectSchema)
      .optional()
      .describe('Sparse recipe token slices keyed by chart type'),
  })
    .optional()
    .describe('Owner-separated Chart theme token slices'),
}).describe('Registered Chart theme definition envelope');

const pathOf = (prefix: ReadonlyArray<string | number>, error: ZodError): ReadonlyArray<string | number> => {
  const issue = error.issues.at(0);
  const issuePath = (issue?.path ?? []).map(segment => (typeof segment === 'symbol' ? String(segment) : segment));
  const unknownKey = issue?.code === 'unrecognized_keys' ? issue.keys.at(0) : undefined;
  return unknownKey === undefined
    ? [...prefix, ...issuePath]
    : [...prefix, ...issuePath, typeof unknownKey === 'symbol' ? String(unknownKey) : unknownKey];
};

const invalidThemeSlice = (path: ReadonlyArray<string | number>, error: ZodError): RetikzChartError =>
  new RetikzChartError({
    code: RetikzChartErrorCode.InvalidRegistry,
    message: 'Chart theme definition contains an invalid owner token slice',
    details: { path: pathOf(path, error) },
    cause: error,
  });

const invalidThemeDefinition = (error: ZodError): RetikzChartError =>
  new RetikzChartError({
    code: RetikzChartErrorCode.InvalidRegistry,
    message: 'Chart theme definition has an invalid declaration envelope',
    details: { path: pathOf(['themes'], error) },
    cause: error,
  });

const assertOptionalPropertyIsDefined = (
  container: object,
  field: string,
  path: ReadonlyArray<string | number>,
): void => {
  const descriptor = Object.getOwnPropertyDescriptor(container, field);
  if (descriptor === undefined || !('value' in descriptor) || descriptor.value !== undefined) return;
  throw new RetikzChartError({
    code: RetikzChartErrorCode.InvalidRegistry,
    message: 'Chart theme definition must omit unset fields instead of using undefined',
    details: { path },
  });
};

/** 校验当前 active recipe 可消费的命名主题 owner slices */
export const validateChartThemeDefinition = (
  theme: ChartThemeDefinition,
  recipes: ReadonlyMap<string, AnyChartRecipeDefinition>,
): void => {
  try {
    assertPlainDataContainers(theme, 'Chart theme definition');
  } catch (cause) {
    throw new RetikzChartError({
      code: RetikzChartErrorCode.InvalidRegistry,
      message: 'Chart theme definition must use plain data containers',
      details: { path: ['themes'] },
      cause,
    });
  }
  try {
    ChartThemeDefinitionEnvelopeSchema.parse(theme);
  } catch (error) {
    if (error instanceof ZodError) throw invalidThemeDefinition(error);
    throw error;
  }
  assertOptionalPropertyIsDefined(theme, 'base', ['themes', 'base']);
  assertOptionalPropertyIsDefined(theme, 'tokens', ['themes', 'tokens']);
  const tokens = theme.tokens;
  if (tokens !== undefined) {
    for (const slice of ['chart', 'plot', 'recipes']) {
      assertOptionalPropertyIsDefined(tokens, slice, ['themes', theme.name, 'tokens', slice]);
    }
  }
  const hasTokens =
    tokens !== undefined &&
    ((tokens.chart !== undefined && Object.keys(tokens.chart).length > 0) ||
      (tokens.plot !== undefined && Object.keys(tokens.plot).length > 0) ||
      (tokens.recipes !== undefined && Object.keys(tokens.recipes).length > 0));
  if (theme.base === undefined && !hasTokens) {
    throw new RetikzChartError({
      code: RetikzChartErrorCode.InvalidRegistry,
      message: `Chart theme "${theme.name}" must define a base or a non-empty token slice`,
      details: { path: ['themes', theme.name] },
    });
  }
  if (tokens?.chart !== undefined) {
    try {
      ChartThemeOverridesSchema.parse(tokens.chart);
    } catch (error) {
      if (error instanceof ZodError) throw invalidThemeSlice(['themes', theme.name, 'tokens', 'chart'], error);
      throw error;
    }
  }
  if (tokens?.plot !== undefined) {
    try {
      PlotThemeTokenOverridesSchema.parse(tokens.plot);
    } catch (error) {
      if (error instanceof ZodError) throw invalidThemeSlice(['themes', theme.name, 'tokens', 'plot'], error);
      throw error;
    }
  }
  for (const [chartType, tokensForRecipe] of Object.entries(tokens?.recipes ?? {})) {
    const recipe = recipes.get(chartType);
    if (recipe === undefined) continue;
    try {
      recipe.theme.overridesSchema.parse(tokensForRecipe);
    } catch (error) {
      if (error instanceof ZodError) {
        throw invalidThemeSlice(['themes', theme.name, 'tokens', 'recipes', chartType], error);
      }
      throw error;
    }
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

/** 按 Core style 与 Source theme 顺序选取去重后的 active Theme Definition */
export const chartThemeDefinitionsOf = (
  source: IRChartSource,
  theme: ResolvedTheme,
  themes: ReadonlyMap<string, ChartThemeDefinition>,
): ReadonlyArray<ChartThemeDefinition> => {
  const definitions: Array<ChartThemeDefinition> = [];
  const applied = new Set<string>();
  const append = (name: string, path: ReadonlyArray<string | number>): void => {
    for (const definition of chartThemeChainOf(name, themes, path)) {
      if (applied.has(definition.name)) continue;
      definitions.push(definition);
      applied.add(definition.name);
    }
  };
  if (theme.style !== undefined) append(theme.style, ['theme', 'style']);
  if (typeof source.theme === 'string') append(source.theme, ['theme']);
  else if (source.theme?.base !== undefined) append(source.theme.base, ['theme', 'base']);
  return definitions;
};
