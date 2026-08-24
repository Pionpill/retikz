import type { IRPlotThemeResolution, IRPlotThemeTokenResolution, PlotThemeTokenValue } from '../../schemas';

type MutablePlotTokens = { -readonly [K in keyof IRPlotThemeTokenResolution]: IRPlotThemeTokenResolution[K] };

const matchesDimension = (dimension: string | ReadonlyArray<string>, candidate: string): boolean =>
  typeof dimension === 'string' ? dimension === candidate : dimension.includes(candidate);

const isDefaultRulePath = (path: string): boolean => path.startsWith('$default/');
const isStyleRulePath = (path: string): boolean => path.startsWith('$style/');
const isNativeTokenSource = (path: string): boolean => path.startsWith('$spec/plotTheme/');
const isDefaultTokenSource = (path: string): boolean => path.startsWith('$default/');
const isStyleTokenSource = (path: string): boolean => path.startsWith('$style/');

/** 为一个已有 Axis dimension 解析 rule-adjusted token */
export const resolvePlotAxisThemeTokens = (
  resolution: IRPlotThemeResolution,
  dimension: string,
): IRPlotThemeTokenResolution => {
  const tokens: MutablePlotTokens = structuredClone(resolution.tokens);
  const sourceByToken = new Map(resolution.tokenSources.map(source => [source.token, source.path]));

  for (const source of resolution.tokenRules) {
    if (!matchesDimension(source.rule.select.dimension, dimension)) continue;
    for (const [token, value] of Object.entries(source.rule.tokens)) {
      const canonicalToken = token as PlotThemeTokenValue;
      const globalSource = sourceByToken.get(canonicalToken);
      if (globalSource === undefined) continue;
      if (isDefaultRulePath(source.path) && !isDefaultTokenSource(globalSource)) continue;
      if (isStyleRulePath(source.path) && !isDefaultTokenSource(globalSource) && !isStyleTokenSource(globalSource))
        continue;
      if (!isDefaultRulePath(source.path) && !isStyleRulePath(source.path) && isNativeTokenSource(globalSource))
        continue;
      (tokens as Record<string, unknown>)[canonicalToken] = structuredClone(value);
    }
  }

  return tokens;
};
