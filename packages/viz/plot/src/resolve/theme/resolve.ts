import type { ResolvedTheme } from '@retikz/core';

import { ThemeTokenSource } from '@retikz/core';
import { strictObject } from 'zod';

import type { PlotThemeStyleDefinition } from '../../contract';
import type { IRPlot, IRPlotThemeResolution, IRPlotThemeTokenResolution } from '../../schemas';

import { RetikzPlotError } from '../../error';
import { getDefaultPlotThemePreset, resolvePlotThemeStyleRegistry } from '../../providers/theme';
import { getAxisTokenRules } from '../../providers/theme/preset';
import {
  PlotAxisThemeTokenRulesSchema,
  PlotThemeResolutionSchema,
  PlotThemeToken,
  PlotThemeTokenOverridesSchema,
} from '../../schemas';
import { applyPlotThemeToTokens, mergePlotTheme, plotThemeFromTokens } from './mapping';

const PlotThemeStyleOverridesSchema = strictObject({
  tokens: PlotThemeTokenOverridesSchema.optional(),
  tokenRules: PlotAxisThemeTokenRulesSchema.optional(),
});

/** 按 Plot style、Plot token 与 native Plot theme 顺序解析主题 */
export const resolvePlotTheme = (
  effectiveTheme: ResolvedTheme,
  input: Pick<IRPlot, 'plotThemeTokens' | 'plotThemeTokenRules' | 'plotTheme'> = {},
  plotThemeStyles: ReadonlyArray<PlotThemeStyleDefinition> | undefined = undefined,
): IRPlotThemeResolution => {
  const { style, mode } = effectiveTheme;
  const styles = resolvePlotThemeStyleRegistry(plotThemeStyles);
  const definition = style === undefined ? undefined : styles.get(style);
  if (style !== undefined && definition === undefined)
    throw new RetikzPlotError(`Plot theme style '${style}' is not registered.`);
  const plotThemeTokens = input.plotThemeTokens ?? {};
  const localTokenRules = input.plotThemeTokenRules ?? [];
  const authoredTheme = input.plotTheme;
  const defaultTokens = getDefaultPlotThemePreset(mode, effectiveTheme.colors.categorical);
  const defaultTokenRules = getAxisTokenRules();
  const styleOverrides = (() => {
    if (definition === undefined) return {};
    try {
      const rawStyleOverrides = definition.resolve(effectiveTheme);
      return PlotThemeStyleOverridesSchema.parse(rawStyleOverrides);
    } catch (cause) {
      throw new RetikzPlotError(`Plot theme style '${style}' resolution failed.`, { cause });
    }
  })();
  const styleTokens = styleOverrides.tokens ?? {};
  const styleTokenRules = styleOverrides.tokenRules ?? [];
  const baseline: IRPlotThemeTokenResolution = {
    ...defaultTokens,
    ...structuredClone(styleTokens),
  };
  const tokensAfterLocal: IRPlotThemeTokenResolution = {
    ...baseline,
    ...structuredClone(plotThemeTokens),
  };
  const tokenTheme = plotThemeFromTokens(tokensAfterLocal);
  const theme = authoredTheme === undefined ? tokenTheme : mergePlotTheme(tokenTheme, authoredTheme);
  const nativeResult =
    authoredTheme === undefined
      ? { tokens: tokensAfterLocal, overrides: [] }
      : applyPlotThemeToTokens(tokensAfterLocal, theme, authoredTheme);
  const tokens = nativeResult.tokens;
  const nativeSources = new Map(nativeResult.overrides.map(source => [source.token, source.path]));
  const tokenSources = Object.values(PlotThemeToken).map(token => {
    const nativePath = nativeSources.get(token);
    if (nativePath !== undefined) {
      return { token, kind: ThemeTokenSource.Local, path: nativePath };
    }
    if (Object.hasOwn(plotThemeTokens, token)) {
      return { token, kind: ThemeTokenSource.Local, path: `$spec/plotThemeTokens/${token}` };
    }
    const styleOwnsToken = style !== undefined && Object.hasOwn(styleTokens, token);
    return {
      token,
      kind: ThemeTokenSource.Local,
      path: styleOwnsToken ? `$style/${style}/${mode}/${token}` : `$default/${mode}/${token}`,
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
    ...defaultTokenRules.map((rule, index) => ({
      rule,
      kind: ThemeTokenSource.Local,
      path: `$default/${mode}/tokenRules/${index}`,
    })),
    ...styleTokenRules.map((rule, index) => ({
      rule,
      kind: ThemeTokenSource.Local,
      path: `$style/${style}/${mode}/tokenRules/${index}`,
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
