import type { ResolvedTheme } from '@retikz/core';

import { ThemeTokenSource } from '@retikz/core';

import type { PlotThemeStyleDefinition } from '../../contract';
import type { IRPlotSpec, IRPlotThemeResolution } from '../../schemas';

import {
  PlotAxisThemeTokenRulesSchema,
  PlotResolvedThemeTokensSchema,
  PlotThemeResolutionSchema,
  PlotThemeSchema,
  PlotThemeToken,
  PlotThemeTokenOverridesSchema,
} from '../../schemas';
import { getDefaultPlotThemePreset } from './catalog';
import { applyPlotThemeToTokens, mergePlotTheme, plotThemeFromTokens } from './mapping';
import { getAxisTokenRules } from './preset';
import { resolvePlotThemeStyleRegistry } from './registry';

/** 按 Plot style、Plot token 与 native Plot theme 顺序解析主题 */
export const resolvePlotTheme = (
  effectiveTheme: ResolvedTheme,
  input: Pick<IRPlotSpec, 'plotThemeTokens' | 'plotThemeTokenRules' | 'plotTheme'> = {},
  plotThemeStyles: ReadonlyArray<PlotThemeStyleDefinition> | undefined = undefined,
): IRPlotThemeResolution => {
  const { style, mode } = effectiveTheme;
  const styles = resolvePlotThemeStyleRegistry(plotThemeStyles);
  const definition = style === undefined ? undefined : styles.get(style);
  if (style !== undefined && definition === undefined)
    throw new Error(`Plot theme style '${style}' is not registered.`);
  const plotThemeTokens = PlotThemeTokenOverridesSchema.parse(input.plotThemeTokens ?? {});
  const localTokenRules = PlotAxisThemeTokenRulesSchema.parse(input.plotThemeTokenRules ?? []);
  const authoredTheme = input.plotTheme === undefined ? undefined : PlotThemeSchema.parse(input.plotTheme);
  const styleResolution =
    definition === undefined
      ? { tokens: getDefaultPlotThemePreset(mode, effectiveTheme.colors.categorical), tokenRules: getAxisTokenRules() }
      : definition.resolve(effectiveTheme);
  const baseline = PlotResolvedThemeTokensSchema.parse(styleResolution.tokens);
  const styleTokenRules = PlotAxisThemeTokenRulesSchema.parse(styleResolution.tokenRules ?? []);
  const tokensAfterLocal = PlotResolvedThemeTokensSchema.parse({
    ...baseline,
    ...structuredClone(plotThemeTokens),
  });
  const tokenTheme = plotThemeFromTokens(tokensAfterLocal);
  const theme = authoredTheme === undefined ? tokenTheme : mergePlotTheme(tokenTheme, authoredTheme);
  const nativeResult =
    authoredTheme === undefined
      ? { tokens: tokensAfterLocal, overrides: [] }
      : applyPlotThemeToTokens(tokensAfterLocal, theme, authoredTheme);
  const tokens = PlotResolvedThemeTokensSchema.parse(nativeResult.tokens);
  const nativeSources = new Map(nativeResult.overrides.map(source => [source.token, source.path]));
  const tokenSources = Object.values(PlotThemeToken).map(token => {
    const nativePath = nativeSources.get(token);
    if (nativePath !== undefined) {
      return { token, kind: ThemeTokenSource.Local, path: nativePath };
    }
    if (Object.hasOwn(plotThemeTokens, token)) {
      return { token, kind: ThemeTokenSource.Local, path: `$spec/plotThemeTokens/${token}` };
    }
    return {
      token,
      kind: ThemeTokenSource.Local,
      path: style === undefined ? `$default/${mode}/${token}` : `$style/${style}/${mode}/${token}`,
    };
  });
  const palette = {
    categorical: [...tokens[PlotThemeToken.PlotPaletteCategorical]],
    series: [...tokens[PlotThemeToken.PlotPaletteSeries]],
    sector: [...tokens[PlotThemeToken.PlotPaletteSector]],
    sequential: tokens[PlotThemeToken.PlotPaletteSequential],
    diverging: tokens[PlotThemeToken.PlotPaletteDiverging],
    shape: structuredClone(tokens[PlotThemeToken.PlotPaletteShape]),
  };
  const authoredOverrides: IRPlotThemeResolution['authoredOverrides'] =
    authoredTheme === undefined ? [] : [{ kind: ThemeTokenSource.Local, path: '$spec/plotTheme' }];
  const tokenRules: IRPlotThemeResolution['tokenRules'] = [
    ...styleTokenRules.map((rule, index) => ({
      rule,
      kind: ThemeTokenSource.Local,
      path:
        style === undefined ? `$default/${mode}/tokenRules/${index}` : `$style/${style}/${mode}/tokenRules/${index}`,
    })),
    ...localTokenRules.map((rule, index) => ({
      rule,
      kind: ThemeTokenSource.Local,
      path: `$spec/plotThemeTokenRules/${index}`,
    })),
  ];
  return PlotThemeResolutionSchema.parse({
    ...(style === undefined ? {} : { style }),
    mode,
    tokens,
    tokenSources,
    tokenRules,
    authoredOverrides,
    plotTheme: theme,
    palette,
  });
};
