import type { ResolvedTheme } from '@retikz/core';

import { ThemeTokenSource } from '@retikz/core';

import type { PlotThemeStyleDefinition } from '../../contract';
import type { IRPlotSpec, IRPlotThemeResolution } from '../../schemas';

import {
  PlotResolvedThemeTokensSchema,
  PlotThemeResolutionSchema,
  PlotThemeSchema,
  PlotThemeToken,
  PlotThemeTokenOverridesSchema,
} from '../../schemas';
import { applyPlotThemeToTokens, mergePlotTheme, plotThemeFromTokens } from './mapping';
import { resolvePlotThemeStyleRegistry } from './registry';

/** 按 Plot style、Plot token 与 native Plot theme 顺序解析主题 */
export const resolvePlotTheme = (
  effectiveTheme: ResolvedTheme,
  input: Pick<IRPlotSpec, 'plotThemeTokens' | 'plotTheme'> = {},
  plotThemeStyles: ReadonlyArray<PlotThemeStyleDefinition> | undefined = undefined,
): IRPlotThemeResolution => {
  const { style, mode } = effectiveTheme;
  const styles = resolvePlotThemeStyleRegistry(plotThemeStyles);
  const definition = styles.get(style);
  if (definition === undefined) throw new Error(`Plot theme style '${style}' is not registered.`);
  const plotThemeTokens = PlotThemeTokenOverridesSchema.parse(input.plotThemeTokens ?? {});
  const authoredTheme = input.plotTheme === undefined ? undefined : PlotThemeSchema.parse(input.plotTheme);
  const baseline = definition.resolve(effectiveTheme);
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
      path: `$style/${style}/${mode}/${token}`,
    };
  });
  const palette = {
    categorical: [...tokens[PlotThemeToken.PlotPaletteCategorical]],
    series: [...tokens[PlotThemeToken.PlotPaletteSeries]],
    sector: [...tokens[PlotThemeToken.PlotPaletteSector]],
    sequential: tokens[PlotThemeToken.PlotPaletteSequential],
    diverging: tokens[PlotThemeToken.PlotPaletteDiverging],
  };
  const authoredOverrides: IRPlotThemeResolution['authoredOverrides'] =
    authoredTheme === undefined ? [] : [{ kind: ThemeTokenSource.Local, path: '$spec/plotTheme' }];
  return PlotThemeResolutionSchema.parse({
    style,
    mode,
    tokens,
    tokenSources,
    authoredOverrides,
    plotTheme: theme,
    palette,
  });
};
