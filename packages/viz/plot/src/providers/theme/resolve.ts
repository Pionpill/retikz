import type { ResolvedTheme } from '@retikz/core';

import { resolveCoreThemeColors } from '@retikz/core';

import type { IRPlotSpec, IRPlotThemeResolution, PlotThemeTokenValue } from '../../schemas';

import {
  PlotResolvedThemeTokensSchema,
  PlotThemeResolutionSchema,
  PlotThemeSchema,
  PlotThemeToken,
  PlotThemeTokenOverridesSchema,
  PlotThemeTokenSource,
} from '../../schemas';
import { getPlotThemePreset } from './catalog';
import { applyPlotThemeToTokens, mergePlotTheme, plotThemeFromTokens } from './mapping';

type PlotThemeContext = Pick<ResolvedTheme, 'style' | 'mode'> & Partial<Pick<ResolvedTheme, 'tokens' | 'colors'>>;

/** 按 Plot preset、Core shared colors、inherited/local token、colors 与 native Plot theme 顺序解析主题 */
export const resolvePlotTheme = (
  effectiveTheme: PlotThemeContext,
  input: Pick<IRPlotSpec, 'plotThemeTokens' | 'colors' | 'plotTheme'> = {},
): IRPlotThemeResolution => {
  const style = effectiveTheme.style;
  const mode = effectiveTheme.mode;
  const sharedColors = effectiveTheme.colors ?? resolveCoreThemeColors(style, mode);
  const inheritedTokens = effectiveTheme.tokens?.plot;
  const plotThemeTokens = PlotThemeTokenOverridesSchema.parse(input.plotThemeTokens ?? {});
  const colors = input.colors === undefined ? undefined : structuredClone(input.colors);
  const authoredTheme = input.plotTheme === undefined ? undefined : PlotThemeSchema.parse(input.plotTheme);
  const preset = getPlotThemePreset(style, mode);
  const sharedCategorical = [...sharedColors.categorical];
  const tokensAfterShared = PlotResolvedThemeTokensSchema.parse({
    ...preset,
    [PlotThemeToken.PlotPaletteCategorical]: sharedCategorical,
    [PlotThemeToken.PlotPaletteSeries]: [...sharedCategorical],
    [PlotThemeToken.PlotPaletteSector]: [...sharedCategorical],
  });
  const inherited = PlotThemeTokenOverridesSchema.parse(inheritedTokens ?? {});
  const tokensAfterInherited = PlotResolvedThemeTokensSchema.parse({
    ...tokensAfterShared,
    ...structuredClone(inherited),
  });
  const tokensAfterLocal = PlotResolvedThemeTokensSchema.parse({
    ...tokensAfterInherited,
    ...structuredClone(plotThemeTokens),
  });
  const tokensAfterColors =
    colors === undefined
      ? tokensAfterLocal
      : PlotResolvedThemeTokensSchema.parse({
          ...tokensAfterLocal,
          [PlotThemeToken.PlotPaletteCategorical]: colors,
          [PlotThemeToken.PlotPaletteSeries]: [...colors],
          [PlotThemeToken.PlotPaletteSector]: [...colors],
        });
  const tokenTheme = plotThemeFromTokens(tokensAfterColors);
  const theme = authoredTheme === undefined ? tokenTheme : mergePlotTheme(tokenTheme, authoredTheme);
  const nativeResult =
    authoredTheme === undefined
      ? { tokens: tokensAfterColors, overrides: [] }
      : applyPlotThemeToTokens(tokensAfterColors, theme, authoredTheme);
  const tokens = PlotResolvedThemeTokensSchema.parse(nativeResult.tokens);
  const nativeSources = new Map(nativeResult.overrides.map(source => [source.token, source.path]));
  const colorTokens = new Set<PlotThemeTokenValue>([
    PlotThemeToken.PlotPaletteCategorical,
    PlotThemeToken.PlotPaletteSeries,
    PlotThemeToken.PlotPaletteSector,
  ]);
  const tokenSources = Object.values(PlotThemeToken).map(token => {
    const nativePath = nativeSources.get(token);
    if (nativePath !== undefined) {
      return { token, kind: PlotThemeTokenSource.PlotTheme, path: nativePath };
    }
    if (colors !== undefined && colorTokens.has(token)) {
      return { token, kind: PlotThemeTokenSource.Colors, path: '$spec/colors' };
    }
    if (Object.hasOwn(plotThemeTokens, token)) {
      return { token, kind: PlotThemeTokenSource.Local, path: `$spec/plotThemeTokens/${token}` };
    }
    if (Object.hasOwn(inherited, token)) {
      return { token, kind: PlotThemeTokenSource.Inherited, path: `$theme/tokens/plot/${token}` };
    }
    if (colorTokens.has(token)) {
      return { token, kind: PlotThemeTokenSource.SharedCategorical, path: '$theme/colors/categorical' };
    }
    return {
      token,
      kind: PlotThemeTokenSource.Preset,
      path: `$preset/${style}/${mode}/${token}`,
    };
  });
  const palette = {
    categorical: [...tokens[PlotThemeToken.PlotPaletteCategorical]],
    series: [...tokens[PlotThemeToken.PlotPaletteSeries]],
    sector: [...tokens[PlotThemeToken.PlotPaletteSector]],
    sequential: tokens[PlotThemeToken.PlotPaletteSequential],
    diverging: tokens[PlotThemeToken.PlotPaletteDiverging],
  };
  const authoredOverrides: IRPlotThemeResolution['authoredOverrides'] = [
    ...(colors === undefined ? [] : [{ kind: PlotThemeTokenSource.Colors, path: '$spec/colors' } as const]),
    ...(authoredTheme === undefined
      ? []
      : [{ kind: PlotThemeTokenSource.PlotTheme, path: '$spec/plotTheme' } as const]),
  ];
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
